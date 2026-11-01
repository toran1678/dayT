#!/usr/bin/env python3
"""PreToolUse guard: prompts (`force_ask`) only when SSoT docs are edited."""

from __future__ import annotations

import json
import os
import pathlib
import sys

PROTECTED_DOCS = {
    "docs/api-spec.yaml": "API 명세서 (docs/api-spec.yaml)",
    "docs/erd.md": "DB 설계서 (docs/erd.md)",
    "docs/prd.md": "제품 요구사항 정의서 (docs/prd.md)",
}


def _norm(p: pathlib.Path) -> str:
    s = str(p.resolve()).replace("\\", "/").rstrip("/")
    return s.lower() if os.name == "nt" else s


def _emit(payload: dict) -> None:
    sys.stdout.buffer.write((json.dumps(payload, ensure_ascii=True) + "\n").encode("utf-8"))


def main() -> int:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace").strip()
    if not raw:
        _emit({"decision": "allow"})
        return 0

    try:
        event = json.loads(raw)
    except json.JSONDecodeError:
        _emit({"decision": "ask", "reason": "Hook 입력 파싱 실패"})
        return 0

    args = (event.get("toolCall") or {}).get("args") or {}
    target_str = next(
        (args[k].strip().strip("\"'") for k in ("Path", "TargetFile", "file_path", "path") if isinstance(args.get(k), str) and args[k].strip()),
        None,
    )
    if not target_str:
        _emit({"decision": "allow"})
        return 0

    repo_root = pathlib.Path(__file__).resolve().parents[2]
    roots = [repo_root] + [
        pathlib.Path(w.strip().strip("\"'"))
        for w in (event.get("workspacePaths") or [])
        if isinstance(w, str) and w.strip()
    ]

    target = pathlib.Path(target_str)
    target = target.resolve() if target.is_absolute() else (roots[0] / target).resolve()
    target_norm = _norm(target)

    for root in roots:
        for rel, label in PROTECTED_DOCS.items():
            if target_norm == _norm(root / rel):
                _emit({
                    "decision": "force_ask",
                    "reason": f"[Spec Guard] {label} 수정 요청입니다. 변경 사유와 영향 범위를 확인 후 승인해 주세요.",
                })
                return 0

    allowed = list(roots) + [pathlib.Path.home() / ".gemini" / "antigravity" / "brain"]
    if isinstance(event.get("artifactDirectoryPath"), str) and event["artifactDirectoryPath"].strip():
        allowed.append(pathlib.Path(event["artifactDirectoryPath"].strip().strip("\"'")))

    is_inside = any(target_norm == _norm(r) or target_norm.startswith(_norm(r) + "/") for r in allowed)
    _emit({"decision": "allow"} if is_inside else {"decision": "ask", "reason": f"워크스페이스 외부 파일({target_str}) 수정 요청"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
