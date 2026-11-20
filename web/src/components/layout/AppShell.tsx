"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  BookOpenText,
  ChevronDown,
  Compass,
  FolderHeart,
  HeartHandshake,
  LogOut,
  MapPin,
  Moon,
  Plus,
  Route,
  SlidersHorizontal,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { PetStageIcon } from "@/features/together/PetStageIcon";
import {
  fetchMyPetApi,
  PET_UPDATED_EVENT,
} from "@/features/together/together-api";
import type { CouplePetResponse } from "@/shared/api/types";

const emptySubscribe = () => () => {};

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
  const navRef = useRef<HTMLDivElement>(null);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [clickedHref, setClickedHref] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [activeRect, setActiveRect] = useState<{
    left: number;
    width: number;
    animate: boolean;
  } | null>(null);
  const [hoverRect, setHoverRect] = useState<{ left: number; width: number } | null>(null);

  // Sync state during render when pathname changes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setClickedHref(null);
  }

  const activeHref = clickedHref ?? pathname ?? "/";

  const measure = useCallback(() => {
    if (!navRef.current) return;
    const nav = navRef.current;
    const items = nav.querySelectorAll<HTMLAnchorElement>("[data-nav-item]");

    // Measure active indicator
    const activeIndex = NAV_ITEMS.findIndex((item) =>
      isNavActive(activeHref, item.href),
    );
    if (activeIndex >= 0 && items[activeIndex]) {
      const el = items[activeIndex];
      setActiveRect((prev) => ({
        left: el.offsetLeft,
        width: el.offsetWidth,
        animate: prev !== null,
      }));
    } else {
      setActiveRect(null);
    }

    // Measure hover indicator
    if (hoveredHref) {
      const hoverIndex = NAV_ITEMS.findIndex((item) => item.href === hoveredHref);
      if (hoverIndex >= 0 && items[hoverIndex]) {
        const el = items[hoverIndex];
        setHoverRect({
          left: el.offsetLeft,
          width: el.offsetWidth,
        });
      }
    } else {
      setHoverRect(null);
    }
  }, [activeHref, hoveredHref]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <nav
      ref={navRef}
      onMouseLeave={() => setHoveredHref(null)}
      aria-label="주요 메뉴"
      className="relative hidden items-center rounded-full border border-line bg-surface-subtle/80 p-1 lg:flex"
    >
      {/* 1. Subtle Hover Pill (Glides to hovered tab) */}
      {hoverRect && (
        <span
          style={{
            left: `${hoverRect.left}px`,
            width: `${hoverRect.width}px`,
          }}
          className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-foreground/[0.05] dark:bg-white/[0.08] transition-all duration-200 ease-out"
        />
      )}

      {/* 2. Active Tab Sliding Pill (Glides with physical momentum) */}
      {activeRect && (
        <span
          style={{
            left: `${activeRect.left}px`,
            width: `${activeRect.width}px`,
          }}
          className={`pointer-events-none absolute top-1 bottom-1 rounded-full border border-line/80 bg-surface shadow-2xs ${
            activeRect.animate
              ? "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              : ""
          }`}
        />
      )}

      {/* 3. Navigation Links */}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(activeHref, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            data-nav-item
            onMouseEnter={() => setHoveredHref(item.href)}
            onClick={() => {
              setClickedHref(item.href);
              setHoveredHref(null);
            }}
            className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 select-none ${
              active
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon
              className={`h-3.5 w-3.5 transition-colors duration-150 ${
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
  const [clickedHref, setClickedHref] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setClickedHref(null);
  }

  const activeHref = clickedHref ?? pathname ?? "/";
  const activeIndex = NAV_ITEMS.findIndex((item) =>
    isNavActive(activeHref, item.href),
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(24,24,27,0.06)] backdrop-blur-md lg:hidden">
      <nav
        aria-label="모바일 하단 메뉴"
        onMouseLeave={() => setHoveredIndex(null)}
        className="relative mx-auto h-16 w-full px-2"
      >
        <div className="relative grid h-full w-full grid-cols-5 items-center">
          {/* 1. Hover Sliding Capsule (Mobile / Pointer) */}
          {hoveredIndex !== null && (
            <div
              aria-hidden="true"
              style={{ transform: `translateX(${hoveredIndex * 100}%)` }}
              className="pointer-events-none absolute inset-y-1.5 left-0 w-1/5 px-1 transition-transform duration-200 ease-out"
            >
              <div className="h-full w-full rounded-xl bg-foreground/[0.04] dark:bg-white/[0.06]" />
            </div>
          )}

          {/* 2. Active Tab Sliding Capsule */}
          {activeIndex >= 0 && (
            <div
              aria-hidden="true"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
              className="pointer-events-none absolute inset-y-1.5 left-0 w-1/5 px-1 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              <div className="flex h-full w-full flex-col items-center rounded-xl border border-primary/20 bg-primary-soft/85 shadow-2xs">
                <span className="h-0.5 w-6 rounded-full bg-primary" />
              </div>
            </div>
          )}

          {/* 3. Navigation Links */}
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const active = activeIndex === index;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => setHoveredIndex(index)}
                onClick={() => {
                  setClickedHref(item.href);
                  setHoveredIndex(null);
                }}
                className={`relative z-10 flex h-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors duration-150 select-none ${
                  active
                    ? "text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MobileFloatingDock() {
  const pathname = usePathname();
  return <MobileFloatingDockView pathname={pathname} />;
}

interface ProfileMenuTriggerProps {
  nickname: string;
  email?: string | null;
  oauthProvider: string;
  onLogout: () => Promise<void>;
}

function HeaderProfileMenuInner({
  nickname,
  email,
  oauthProvider,
  onLogout,
}: ProfileMenuTriggerProps) {
  const pathname = usePathname();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    function handleMouseDown(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const isOnSettings =
    pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <div ref={profileMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsProfileMenuOpen((prev) => !prev)}
        aria-expanded={isProfileMenuOpen}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 rounded-full border bg-surface py-1 pr-2.5 pl-1.5 text-xs font-bold text-foreground shadow-2xs transition-colors ${
          isProfileMenuOpen || isOnSettings
            ? "border-primary/50"
            : "border-line hover:border-primary/40"
        }`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-dark text-[10px] font-black text-white">
          {nickname.slice(0, 1)}
        </span>
        <span className="max-w-24 truncate">{nickname}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted transition-transform duration-150 ${
            isProfileMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isProfileMenuOpen && (
        <div
          role="menu"
          aria-label="계정 메뉴"
          className="absolute top-full right-0 z-50 mt-2 w-48 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(24,24,27,0.12)]"
        >
          <div className="mb-1 border-b border-line/70 px-3 py-2">
            <p className="truncate text-xs font-extrabold text-foreground">
              {nickname}
            </p>
            <p className="truncate text-[11px] text-muted">
              {email ?? `${oauthProvider} 계정`}
            </p>
          </div>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsProfileMenuOpen(false)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-surface-subtle"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>환경설정</span>
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsProfileMenuOpen(false);
              void onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-surface-subtle hover:text-red-600 dark:hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const {
    user,
    isInitializing,
    openLoginModal,
    logout,
    authenticatedFetch,
  } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [headerPet, setHeaderPet] = useState<CouplePetResponse | null>(null);
  const activeHeaderPet = user?.coupleId ? headerPet : null;

  useEffect(() => {
    const coupleId = user?.coupleId;
    if (!coupleId) {
      return;
    }
    let active = true;
    async function syncPetBadge() {
      try {
        const pet = await fetchMyPetApi(authenticatedFetch);
        if (active) setHeaderPet(pet);
      } catch {
        if (active) setHeaderPet(null);
      }
    }
    void syncPetBadge();

    function handlePetUpdated(event: Event) {
      const custom = event as CustomEvent<CouplePetResponse>;
      if (custom.detail) {
        setHeaderPet(custom.detail);
      }
    }
    window.addEventListener(PET_UPDATED_EVENT, handlePetUpdated);
    return () => {
      active = false;
      window.removeEventListener(PET_UPDATED_EVENT, handlePetUpdated);
    };
  }, [user?.coupleId, authenticatedFetch]);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Top Floating Editorial Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[68px] lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dark text-white transition-transform group-hover:scale-105">
                <MapPin className="h-4 w-4 stroke-[2.2] text-primary" />
              </span>
              <div className="flex flex-col">
                <span className="text-lg leading-none font-black tracking-tight text-foreground">
                  Day<span className="text-primary">T</span>
                </span>
                <span className="mt-0.5 text-[9px] font-semibold tracking-wider text-muted uppercase">
                  Route & Moments
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
              className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-surface-subtle sm:inline-flex"
            >
              <PetStageIcon
                variant="badge"
                characterType={activeHeaderPet?.characterType}
                className="h-4 w-4 shrink-0 text-primary"
              />
              {activeHeaderPet ? (
                <>
                  <span>Lv.{activeHeaderPet.level}</span>
                  <span className="h-2.5 w-px bg-line" />
                  <span className="text-primary font-bold">
                    만남 {activeHeaderPet.totalMeetDays}회
                  </span>
                </>
              ) : (
                <span className="text-muted">커플 스페이스</span>
              )}
            </Link>

            <Link
              href="/courses/new"
              className="hidden items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover shadow-2xs md:inline-flex"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>새 코스 만들기</span>
            </Link>

            {user ? (
              <Suspense
                fallback={
                  <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1.5 text-xs font-bold text-foreground shadow-2xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-dark text-[10px] font-black text-white">
                      {user.nickname.slice(0, 1)}
                    </span>
                    <span className="max-w-24 truncate">{user.nickname}</span>
                  </div>
                }
              >
                <HeaderProfileMenuInner
                  nickname={user.nickname}
                  email={user.email}
                  oauthProvider={user.oauthProvider}
                  onLogout={logout}
                />
              </Suspense>
            ) : (
              <button
                type="button"
                disabled={isInitializing}
                onClick={openLoginModal}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <UserRound className="h-3.5 w-3.5 text-white/80" />
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

      {/* Global Floating Theme Toggle (Accessible everywhere including above modals) */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="화면 테마 전환"
        title="화이트·다크 모드 전환"
        className="fixed right-4 bottom-20 z-[70] inline-flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3.5 py-2 text-xs font-extrabold text-foreground shadow-lg backdrop-blur-md transition-transform hover:scale-105 lg:right-6 lg:bottom-6"
      >
        {isMounted && resolvedTheme === "dark" ? (
          <>
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <span>라이트 모드</span>
          </>
        ) : (
          <>
            <Moon className="h-3.5 w-3.5 text-primary" />
            <span>다크 모드</span>
          </>
        )}
      </button>
    </div>
  );
}
