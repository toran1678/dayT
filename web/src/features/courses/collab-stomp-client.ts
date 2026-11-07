import { WS_COLLAB_URL } from "@/shared/api/client";
import type { CourseDetail, CourseUpsertRequest } from "@/shared/api/types";

export type CollabActionType =
  | "PRESENCE_JOIN"
  | "PRESENCE_LEAVE"
  | "SYNC_COURSE"
  | "COLLAB_STATUS";

export interface CollabBroadcastEvent {
  action: CollabActionType;
  courseId: number;
  editorUserId: number;
  editorNickname: string;
  clientSessionId: string | null;
  course: CourseDetail;
  timestamp: string;
}

export interface CollabEditPayload {
  action: CollabActionType;
  clientSessionId: string;
  course?: CourseUpsertRequest | null;
}

export interface CollabConnectionCallbacks {
  onConnectStateChange?: (state: "connecting" | "connected" | "disconnected") => void;
  onBroadcast?: (event: CollabBroadcastEvent) => void;
}

export interface CollabStompHandle {
  sessionId: string;
  sendEdit: (course: CourseUpsertRequest) => void;
  disconnect: () => void;
}

function createClientSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildStompFrame(
  command: string,
  headers: Record<string, string>,
  body = "",
): string {
  const headerLines = Object.entries(headers)
    .map(([key, val]) => `${key}:${val}`)
    .join("\n");
  return `${command}\n${headerLines}\n\n${body}\0`;
}

function parseStompFrames(buffer: string): {
  frames: { command: string; headers: Record<string, string>; body: string }[];
  remainder: string;
} {
  const parts = buffer.split("\0");
  const remainder = parts.pop() ?? "";
  const frames: {
    command: string;
    headers: Record<string, string>;
    body: string;
  }[] = [];

  for (const raw of parts) {
    const trimmed = raw.replace(/^\n+/, "");
    if (!trimmed) continue;

    const dividerIndex = trimmed.indexOf("\n\n");
    const headerBlock =
      dividerIndex >= 0 ? trimmed.slice(0, dividerIndex) : trimmed;
    const body = dividerIndex >= 0 ? trimmed.slice(dividerIndex + 2) : "";

    const lines = headerBlock.split("\n");
    const command = (lines[0] ?? "").trim();
    if (!command) continue;

    const headers: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        headers[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
      }
    }
    frames.push({ command, headers, body });
  }

  return { frames, remainder };
}

export function connectCourseCollabStomp(
  courseId: number,
  accessToken: string,
  callbacks: CollabConnectionCallbacks,
): CollabStompHandle {
  const sessionId = createClientSessionId();
  let socket: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let manuallyClosed = false;
  let isStompConnected = false;
  let receiveBuffer = "";

  const destinationTopic = `/topic/courses/${courseId}`;
  const destinationSend = `/app/courses/${courseId}/edit`;

  function cleanupTimers() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function sendPayload(payload: CollabEditPayload) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !isStompConnected) {
      return;
    }
    const json = JSON.stringify(payload);
    socket.send(
      buildStompFrame(
        "SEND",
        {
          destination: destinationSend,
          "content-type": "application/json",
        },
        json,
      ),
    );
  }

  function openSocket() {
    if (manuallyClosed || typeof window === "undefined") return;
    queueMicrotask(() => {
      if (!manuallyClosed && !isStompConnected) {
        callbacks.onConnectStateChange?.("connecting");
      }
    });
    isStompConnected = false;
    receiveBuffer = "";

    try {
      socket = new WebSocket(WS_COLLAB_URL);
    } catch {
      callbacks.onConnectStateChange?.("disconnected");
      return;
    }

    socket.onopen = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(
        buildStompFrame("CONNECT", {
          "accept-version": "1.2",
          "heart-beat": "10000,10000",
          Authorization: `Bearer ${accessToken}`,
        }),
      );
    };

    socket.onmessage = (msgEvent) => {
      if (typeof msgEvent.data !== "string") return;
      if (msgEvent.data === "\n" || msgEvent.data === "\r\n") {
        return;
      }

      receiveBuffer += msgEvent.data;
      const { frames, remainder } = parseStompFrames(receiveBuffer);
      receiveBuffer = remainder;

      for (const frame of frames) {
        if (frame.command === "CONNECTED") {
          isStompConnected = true;
          callbacks.onConnectStateChange?.("connected");

          socket?.send(
            buildStompFrame("SUBSCRIBE", {
              id: `sub-course-${courseId}`,
              destination: destinationTopic,
            }),
          );

          sendPayload({
            action: "PRESENCE_JOIN",
            clientSessionId: sessionId,
            course: null,
          });

          if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send("\n");
            }
          }, 10000);
        } else if (frame.command === "MESSAGE" && frame.body) {
          try {
            const parsed = JSON.parse(frame.body) as CollabBroadcastEvent;
            callbacks.onBroadcast?.(parsed);
          } catch {
            // Ignore malformed message frame
          }
        }
      }
    };

    socket.onclose = () => {
      isStompConnected = false;
      cleanupTimers();
      callbacks.onConnectStateChange?.("disconnected");
      if (!manuallyClosed) {
        reconnectTimer = setTimeout(() => {
          openSocket();
        }, 3000);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  }

  openSocket();

  return {
    sessionId,
    sendEdit(course: CourseUpsertRequest) {
      sendPayload({
        action: "SYNC_COURSE",
        clientSessionId: sessionId,
        course,
      });
    },
    disconnect() {
      manuallyClosed = true;
      cleanupTimers();
      if (socket && socket.readyState === WebSocket.OPEN && isStompConnected) {
        try {
          sendPayload({
            action: "PRESENCE_LEAVE",
            clientSessionId: sessionId,
            course: null,
          });
          socket.send(buildStompFrame("DISCONNECT", {}));
        } catch {
          // Ignore closing errors
        }
      }
      socket?.close();
      socket = null;
    },
  };
}
