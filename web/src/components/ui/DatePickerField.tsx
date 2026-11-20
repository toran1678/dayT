"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;

interface ParsedIsoDate {
  year: number;
  month: number;
  day: number;
}

function parseIsoDate(iso: string): ParsedIsoDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getTodaySeoulIso(): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function getThisWeekendSaturdayIso(): string {
  const todayIso = getTodaySeoulIso();
  const parsed = parseIsoDate(todayIso);
  if (!parsed) return todayIso;
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const dayOfWeek = utc.getUTCDay();
  const diffDays = (6 - dayOfWeek + 7) % 7;
  utc.setUTCDate(utc.getUTCDate() + diffDays);
  return toIsoDate(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
  );
}

export function formatKoreanDateLabel(isoDate: string): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const dow = DAY_NAMES[utc.getUTCDay()];
  return `${parsed.year}년 ${parsed.month}월 ${parsed.day}일 (${dow})`;
}

interface DatePickerFieldProps {
  id?: string;
  value: string;
  onChange: (nextIsoDate: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

export function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "날짜 선택",
  allowClear = true,
  className = "",
}: DatePickerFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const todayIso = getTodaySeoulIso();
  const weekendIso = getThisWeekendSaturdayIso();

  const initialAnchor = parseIsoDate(value) ??
    parseIsoDate(todayIso) ?? { year: 2026, month: 1, day: 1 };
  const [viewYear, setViewYear] = useState(initialAnchor.year);
  const [viewMonth, setViewMonth] = useState(initialAnchor.month);

  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleToggleOpen() {
    if (!isOpen) {
      const target = parseIsoDate(value) ?? parseIsoDate(todayIso);
      if (target) {
        setViewYear(target.year);
        setViewMonth(target.month);
      }
    }
    setIsOpen((prev) => !prev);
  }

  function handleStepMonth(delta: -1 | 1) {
    const shifted = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1));
    setViewYear(shifted.getUTCFullYear());
    setViewMonth(shifted.getUTCMonth() + 1);
  }

  const calendarCells = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
    const startOffset = firstDayUtc.getUTCDay();
    const cells: {
      iso: string;
      day: number;
      inCurrentMonth: boolean;
      dayOfWeek: number;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const dateObj = new Date(
        Date.UTC(viewYear, viewMonth - 1, 1 - startOffset + i),
      );
      const y = dateObj.getUTCFullYear();
      const m = dateObj.getUTCMonth() + 1;
      const d = dateObj.getUTCDate();
      cells.push({
        iso: toIsoDate(y, m, d),
        day: d,
        inCurrentMonth: m === viewMonth,
        dayOfWeek: dateObj.getUTCDay(),
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-background px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
          isOpen
            ? "border-foreground text-foreground"
            : "border-line text-foreground hover:border-foreground/35"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span
            className={`truncate ${
              value ? "text-foreground" : "font-medium text-muted"
            }`}
          >
            {value ? formatKoreanDateLabel(value) : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="달력 날짜 선택"
          className="absolute top-full left-0 z-50 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-surface p-3.5 shadow-xl sm:w-80"
        >
          {/* Calendar Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleStepMonth(-1)}
              aria-label="이전 달"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-black text-foreground">
              {viewYear}년 {viewMonth}월
            </span>
            <button
              type="button"
              onClick={() => handleStepMonth(1)}
              aria-label="다음 달"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold text-muted">
            {DAY_NAMES.map((dayName, idx) => (
              <span
                key={dayName}
                className={
                  idx === 0
                    ? "text-rose-500 dark:text-rose-400"
                    : idx === 6
                      ? "text-sky-600 dark:text-sky-400"
                      : ""
                }
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* 6x7 Date Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarCells.map((cell) => {
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    if (isSelected && allowClear) {
                      onChange("");
                    } else {
                      onChange(cell.iso);
                    }
                    setIsOpen(false);
                  }}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs transition-colors ${
                    isSelected
                      ? "bg-primary font-black text-white shadow-2xs"
                      : isToday
                        ? "border border-primary/50 font-extrabold text-primary hover:bg-primary-soft"
                        : cell.inCurrentMonth
                          ? cell.dayOfWeek === 0
                            ? "font-semibold text-rose-500 hover:bg-surface-subtle dark:text-rose-400"
                            : cell.dayOfWeek === 6
                              ? "font-semibold text-sky-600 hover:bg-surface-subtle dark:text-sky-400"
                              : "font-semibold text-foreground hover:bg-surface-subtle"
                          : "font-normal text-muted/35 hover:bg-surface-subtle/50"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Chips */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange(value === todayIso && allowClear ? "" : todayIso);
                  setIsOpen(false);
                }}
                className={`rounded-full border border-solid px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  value === todayIso
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface-subtle text-muted hover:text-foreground"
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(
                    value === weekendIso && allowClear ? "" : weekendIso,
                  );
                  setIsOpen(false);
                }}
                className={`rounded-full border border-solid px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  value === weekendIso
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface-subtle text-muted hover:text-foreground"
                }`}
              >
                이번 주말
              </button>
            </div>

            {allowClear && value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-[11px] font-bold text-muted transition-colors hover:text-foreground"
              >
                선택 해제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

