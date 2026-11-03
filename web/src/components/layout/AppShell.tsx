"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  BookOpenText,
  Compass,
  FolderHeart,
  HeartHandshake,
  MapPin,
  Route,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "데이트 탐색",
    mobileLabel: "탐색",
    icon: Compass,
  },
  {
    href: "/courses/new",
    label: "코스 메이커",
    mobileLabel: "메이커",
    icon: Route,
  },
  {
    href: "/courses",
    label: "코스 보관함",
    mobileLabel: "보관함",
    icon: FolderHeart,
  },
  {
    href: "/together",
    label: "커플 스페이스",
    mobileLabel: "우리 둘",
    icon: HeartHandshake,
  },
  {
    href: "/diaries",
    label: "일기장",
    mobileLabel: "일기장",
    icon: BookOpenText,
  },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/courses") {
    return (
      pathname === "/courses" ||
      (pathname.startsWith("/courses/") && pathname !== "/courses/new")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopPillNavView({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="hidden items-center gap-1 rounded-full border border-line bg-surface-subtle/80 p-1 lg:flex"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname !== null && isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs transition-all ${
              active
                ? "bg-surface font-bold text-foreground shadow-xs"
                : "font-medium text-muted hover:text-foreground"
            }`}
          >
            <Icon
              className={`h-3.5 w-3.5 ${
                active ? "text-primary" : "text-muted"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DesktopPillNav() {
  const pathname = usePathname();
  return <DesktopPillNavView pathname={pathname} />;
}

function MobileFloatingDockView({ pathname }: { pathname: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
      <nav
        aria-label="모바일 하단 메뉴"
        className="pointer-events-auto mx-auto grid h-16 max-w-md grid-cols-5 items-center rounded-2xl border border-line/90 bg-surface/90 px-1.5 shadow-[0_12px_32px_rgba(24,24,27,0.12)] backdrop-blur-md"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname !== null && isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] transition-all ${
                active
                  ? "font-bold text-primary"
                  : "font-medium text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-primary-soft" : "bg-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function MobileFloatingDock() {
  const pathname = usePathname();
  return <MobileFloatingDockView pathname={pathname} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isInitializing, openLoginModal, openProfileModal } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Top Floating Editorial Header */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className=" relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs transition-transform group-hover:scale-105">
                <MapPin className="h-4 w-4 stroke-[2.5]" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-dark text-[8px] font-bold text-amber-300">
                  ✦
                </span>
              </span>
              <div className="flex flex-col">
                <span className="text-lg leading-none font-black tracking-tight text-foreground">
                  Day<span className="text-primary">T</span>
                </span>
                <span className="mt-0.5 text-[10px] font-semibold tracking-wider text-muted">
                  ALL-IN-ONE DATE ROUTE
                </span>
              </div>
            </Link>
          </div>

          {/* Center Segmented Pill Nav (Desktop) */}
          <Suspense fallback={<DesktopPillNavView pathname={null} />}>
            <DesktopPillNav />
          </Suspense>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              href="/together"
              className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft/50 sm:inline-flex"
            >
              <span className="text-sm leading-none">🐣</span>
              <span>Lv.2</span>
              <span className="h-3 w-px bg-line" />
              <span className="text-primary">D+6</span>
            </Link>

            <Link
              href="/courses/new"
              className="hidden items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 md:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI 코스 설계</span>
            </Link>

            {user ? (
              <button
                type="button"
                onClick={openProfileModal}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-2 text-xs font-extrabold text-foreground shadow-2xs transition-colors hover:border-primary/40"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                  {user.nickname.slice(0, 1)}
                </span>
                <span className="max-w-24 truncate">{user.nickname}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isInitializing}
                onClick={openLoginModal}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <UserRound className="h-3.5 w-3.5 text-primary" />
                <span>로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container (Full 7xl Width for Rich Split Map Views) */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>

      {/* Mobile Floating Island Bottom Dock */}
      <Suspense fallback={<MobileFloatingDockView pathname={null} />}>
        <MobileFloatingDock />
      </Suspense>
    </div>
  );
}
