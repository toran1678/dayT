"use client";

import Image from "next/image";
import {
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Bell,
  Check,
  Compass,
  Database,
  Download,
  HeartHandshake,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  clearDraftPlaces,
  useDraftPlaces,
} from "@/features/places/draft-course-storage";
import { useTheme, type Theme } from "@/features/theme/ThemeContext";
import { ApiError } from "@/shared/api/client";
import type { UserSummary, UserUpdateRequest } from "@/shared/api/types";

const emptySubscribe = () => () => {};

type SettingsSectionId =
  | "profile"
  | "appearance"
  | "preferences"
  | "couple"
  | "notifications"
  | "data";

interface SettingsMenuItem {
  id: SettingsSectionId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  isPreview?: boolean;
}

interface SettingsMenuGroup {
  title: string;
  items: SettingsMenuItem[];
}

const SETTINGS_GROUPS: SettingsMenuGroup[] = [
  {
    title: "계정 및 화면",
    items: [
      {
        id: "profile",
        label: "내 프로필 설정",
        shortLabel: "프로필",
        description: "닉네임, 프로필 이미지 및 연동 계정",
        icon: UserRound,
      },
      {
        id: "appearance",
        label: "화면 · 테마 설정",
        shortLabel: "화면 · 테마",
        description: "화이트·다크 모드 및 인터페이스 표시",
        icon: Palette,
      },
    ],
  },
  {
    title: "서비스 환경설정",
    items: [
      {
        id: "preferences",
        label: "데이트 기본 취향",
        shortLabel: "기본 취향",
        description: "기본 상권, 예산 및 선호 코스 템포",
        icon: Compass,
        isPreview: true,
      },
      {
        id: "couple",
        label: "커플 · 공개 범위",
        shortLabel: "커플 · 공개",
        description: "코스 공유 범위 및 펫 배지 표시",
        icon: HeartHandshake,
        isPreview: true,
      },
      {
        id: "notifications",
        label: "알림 · 리마인더",
        shortLabel: "알림",
        description: "데이트 일정, 공동편집 및 축제 소식",
        icon: Bell,
        isPreview: true,
      },
      {
        id: "data",
        label: "데이터 · 관리",
        shortLabel: "데이터",
        description: "임시 코스 초안 정리 및 세션 관리",
        icon: Database,
      },
    ],
  },
];

const ALL_MENU_ITEMS: SettingsMenuItem[] = SETTINGS_GROUPS.flatMap(
  (group) => group.items,
);

interface ThemeOptionItem {
  id: Theme;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

const THEME_OPTIONS: ThemeOptionItem[] = [
  {
    id: "light",
    label: "화이트 모드",
    shortLabel: "화이트",
    description: "따뜻하고 정갈한 크림 화이트 캔버스",
    icon: Sun,
  },
  {
    id: "dark",
    label: "다크 모드",
    shortLabel: "다크",
    description: "눈의 피로를 줄여주는 차콜 다크 캔버스",
    icon: Moon,
  },
  {
    id: "system",
    label: "시스템 설정",
    shortLabel: "시스템",
    description: "기기의 OS 화면 모드에 자동 맞춤",
    icon: Monitor,
  },
];

const DEFAULT_REGIONS = [
  "성수역",
  "홍대입구역",
  "연남동",
  "강남역",
  "잠실역",
  "이태원역",
] as const;

const DEFAULT_BUDGETS = [
  "3만원 이하",
  "5만원 이하",
  "8만원 이하",
  "예산 무관",
] as const;

const DEFAULT_TEMPOS = [
  "여유로운 반나절",
  "알찬 종일 코스",
  "무드 있는 저녁",
] as const;

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function ThemePreviewSwatch({ mode }: { mode: Theme }) {
  if (mode === "light") {
    return (
      <div
        aria-hidden="true"
        className="flex h-9 w-12 shrink-0 flex-col justify-between overflow-hidden rounded-lg border border-[#eae7e1] bg-[#fbfbfa] p-1.5"
      >
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#df5435]" />
          <span className="h-1 w-4 rounded-full bg-[#191817]/20" />
        </div>
        <div className="h-3 w-full rounded bg-[#ffffff] border border-[#eae7e1]" />
      </div>
    );
  }

  if (mode === "dark") {
    return (
      <div
        aria-hidden="true"
        className="flex h-9 w-12 shrink-0 flex-col justify-between overflow-hidden rounded-lg border border-[#2c2925] bg-[#131211] p-1.5"
      >
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e65d3e]" />
          <span className="h-1 w-4 rounded-full bg-[#f6f5f2]/30" />
        </div>
        <div className="h-3 w-full rounded bg-[#1b1a18] border border-[#2c2925]" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="grid h-9 w-12 shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-line"
    >
      <div className="flex flex-col justify-between bg-[#fbfbfa] p-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#df5435]" />
        <div className="h-3 rounded-xs bg-[#ffffff] border border-[#eae7e1]" />
      </div>
      <div className="flex flex-col justify-between bg-[#131211] p-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e65d3e]" />
        <div className="h-3 rounded-xs bg-[#1b1a18] border border-[#2c2925]" />
      </div>
    </div>
  );
}

interface SettingToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  badgeText?: string;
}

function SettingToggleRow({
  title,
  description,
  checked,
  onToggle,
  badgeText,
}: SettingToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle/40 px-4 py-3.5">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-foreground sm:text-sm">
            {title}
          </span>
          {badgeText && (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
              {badgeText}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ${
          checked
            ? "border-primary bg-primary"
            : "border-line bg-surface-subtle"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
            checked ? "translate-x-5.5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function PreviewNoticeBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-subtle/60 px-3.5 py-2.5 text-xs text-muted">
      <span>{text}</span>
      <span className="shrink-0 rounded-full border border-primary/25 bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
        향후 연동 예정
      </span>
    </div>
  );
}

function SectionCard({
  title,
  description,
  rightNode,
  children,
}: {
  title: string;
  description: string;
  rightNode?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line/70 pb-4">
        <div>
          <h2 className="text-base font-black tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
        {rightNode}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

interface ProfileEditFormProps {
  user: UserSummary;
  updateProfile: (payload: UserUpdateRequest) => Promise<UserSummary>;
  logout: () => Promise<void>;
}

function ProfileEditForm({ user, updateProfile, logout }: ProfileEditFormProps) {
  const [nickname, setNickname] = useState(user.nickname);
  const [profileImageUrl, setProfileImageUrl] = useState(
    user.profileImageUrl ?? "",
  );
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedAvatarUrl = profileImageUrl.trim();
  const canShowAvatarImage =
    Boolean(trimmedAvatarUrl) &&
    isValidHttpUrl(trimmedAvatarUrl) &&
    failedImageUrl !== trimmedAvatarUrl;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) return;

    setErrorMessage(null);
    setSavedNotice(false);
    setIsSaving(true);

    try {
      await updateProfile({
        nickname: trimmedNickname,
        profileImageUrl: trimmedAvatarUrl || null,
      });
      setSavedNotice(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("프로필 수정 중 오류가 발생했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoutClick() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Summary Strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface-subtle/60 p-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-primary-soft text-primary">
          {canShowAvatarImage ? (
            <Image
              src={trimmedAvatarUrl}
              alt={`${nickname.trim() || user.nickname} 프로필`}
              fill
              unoptimized
              referrerPolicy="no-referrer"
              onError={() => setFailedImageUrl(trimmedAvatarUrl)}
              className="object-cover"
            />
          ) : (
            <span className="text-lg font-black">
              {(nickname.trim() || user.nickname).slice(0, 1) || (
                <UserRound className="h-6 w-6" />
              )}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-foreground">
              {nickname.trim() || user.nickname}
            </h3>
            <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] font-extrabold text-muted">
              {user.oauthProvider}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="truncate">{user.email ?? "이메일 미등록"}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
              {user.coupleId ? (
                <>
                  <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                  <span>커플 #{user.coupleId} 연결됨</span>
                </>
              ) : (
                <>
                  <UserRound className="h-3.5 w-3.5 text-muted" />
                  <span>솔로 모드</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="settings-profile-nickname"
              className="block text-xs font-bold text-foreground"
            >
              닉네임
            </label>
            <span className="text-[11px] font-medium text-muted">
              {nickname.length}/50
            </span>
          </div>
          <input
            id="settings-profile-nickname"
            type="text"
            required
            maxLength={50}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setSavedNotice(false);
            }}
            placeholder="표시할 닉네임을 입력하세요"
            className="mt-1.5 w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>

        <div>
          <label
            htmlFor="settings-profile-image-url"
            className="block text-xs font-bold text-foreground"
          >
            프로필 이미지 URL <span className="font-normal text-muted">(선택)</span>
          </label>
          <div className="relative mt-1.5">
            <input
              id="settings-profile-image-url"
              type="url"
              value={profileImageUrl}
              onChange={(e) => {
                setProfileImageUrl(e.target.value);
                setSavedNotice(false);
              }}
              placeholder="https://example.com/profile.jpg"
              className="w-full rounded-xl border border-line bg-background py-2.5 pr-9 pl-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
            {profileImageUrl && (
              <button
                type="button"
                onClick={() => {
                  setProfileImageUrl("");
                  setSavedNotice(false);
                }}
                aria-label="프로필 이미지 URL 지우기"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            {errorMessage}
          </p>
        )}

        {savedNotice && (
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
            <Check className="h-3.5 w-3.5" />
            <span>프로필 변경사항이 저장되었습니다.</span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
          <button
            type="button"
            disabled={isLoggingOut || isSaving}
            onClick={() => void handleLogoutClick()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-background px-4 py-2.5 text-xs font-bold text-muted transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:hover:border-red-800/70 dark:hover:text-red-400"
          >
            {isLoggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            <span>로그아웃</span>
          </button>

          <button
            type="submit"
            disabled={isSaving || isLoggingOut || !nickname.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-2xs transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>변경사항 저장</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function SettingsClientView() {
  const { user, isInitializing, updateProfile, logout, openLoginModal } =
    useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const draftPlaces = useDraftPlaces();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("profile");

  // Appearance dummy sub-options
  const [autoNightMap, setAutoNightMap] = useState(true);
  const [distanceUnit, setDistanceUnit] = useState<"walk" | "meter">("walk");
  const [compactTimeline, setCompactTimeline] = useState(false);

  // Date preferences dummy state
  const [defaultRegion, setDefaultRegion] = useState<string>("성수역");
  const [defaultBudget, setDefaultBudget] = useState<string>("5만원 이하");
  const [defaultTempo, setDefaultTempo] = useState<string>("여유로운 반나절");
  const [preferIndoorRainy, setPreferIndoorRainy] = useState(true);
  const [prefSavedNotice, setPrefSavedNotice] = useState(false);

  // Couple & privacy dummy state
  const [autoShareCouple, setAutoShareCouple] = useState(true);
  const [showCostOnShareLink, setShowCostOnShareLink] = useState(true);
  const [showHeaderPetBadge, setShowHeaderPetBadge] = useState(true);
  const [diaryVisibility, setDiaryVisibility] = useState<"couple" | "private">(
    "couple",
  );

  // Notification dummy state
  const [notifyDateReminder, setNotifyDateReminder] = useState(true);
  const [notifyPartnerCollab, setNotifyPartnerCollab] = useState(true);
  const [notifyPetMission, setNotifyPetMission] = useState(true);
  const [notifyFestivalNews, setNotifyFestivalNews] = useState(false);

  // Data management feedback state
  const [draftClearedNotice, setDraftClearedNotice] = useState(false);
  const [exportPreviewNotice, setExportPreviewNotice] = useState(false);

  function handleClearDrafts() {
    clearDraftPlaces();
    setDraftClearedNotice(true);
  }

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <header>
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
          <span className="h-0.5 w-5 bg-primary" />
          <span>PREFERENCES & ACCOUNT</span>
        </div>
        <h1 className="mt-2 text-2xl leading-snug font-black tracking-tight text-foreground sm:text-3xl">
          개인 설정
        </h1>
        <p className="mt-1 text-xs font-medium text-muted sm:text-sm">
          계정 프로필, 화면 테마 및 데이트 기본 환경설정을 한곳에서 관리하세요.
        </p>
      </header>

      {/* Mobile 2-Column Bento Category Selector (< lg) */}
      <nav
        aria-label="설정 카테고리 메뉴"
        className="rounded-2xl border border-line bg-surface p-3 shadow-xs lg:hidden"
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`relative flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary-soft/60 text-foreground shadow-2xs"
                    : "border-line bg-surface-subtle/45 text-muted hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    isActive
                      ? "border-primary/25 bg-surface text-primary"
                      : "border-line/70 bg-surface text-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-extrabold text-foreground sm:text-sm">
                      {item.shortLabel}
                    </span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 12-Column Responsive Settings Workspace */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left Sidebar Navigation & Quick Theme Switcher */}
        <aside className="space-y-4 lg:col-span-4 xl:col-span-3">
          {/* Account Mini Card */}
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
            {isInitializing ? (
              <div className="flex items-center gap-3 py-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-subtle">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">
                    계정 확인 중...
                  </p>
                  <p className="text-[11px] text-muted">잠시만 기다려 주세요</p>
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-black text-primary">
                  {user.nickname.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-black text-foreground">
                      {user.nickname}
                    </p>
                    <span className="rounded bg-surface-subtle px-1.5 py-0.5 text-[9px] font-bold text-muted">
                      {user.oauthProvider}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted">
                    {user.email ?? "이메일 미등록"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-muted">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-foreground">
                      게스트 모드
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      테마 설정은 즉시 적용됩니다
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  로그인
                </button>
              </div>
            )}
          </div>

          {/* Desktop Grouped Vertical Navigation */}
          <nav
            aria-label="설정 섹션"
            className="hidden space-y-4 rounded-2xl border border-line bg-surface p-3 shadow-xs lg:block"
          >
            {SETTINGS_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="px-2.5 pb-1 text-[10px] font-extrabold tracking-wider text-muted uppercase">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-primary-soft/75 text-foreground"
                          : "text-muted hover:bg-surface-subtle hover:text-foreground"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-primary" : "text-muted"
                          }`}
                        />
                        <span
                          className={`truncate text-xs ${
                            isActive ? "font-extrabold" : "font-semibold"
                          }`}
                        >
                          {item.label}
                        </span>
                      </span>
                      {item.isPreview && (
                        <span className="shrink-0 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[9px] font-bold text-muted">
                          준비중
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Quick Theme Switcher (Always Accessible Across Sections) */}
          <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-xs">
            <div className="flex items-center justify-between px-0.5 pb-2.5">
              <span className="text-[11px] font-extrabold text-foreground">
                빠른 화면 모드
              </span>
              {mounted && (
                <span className="text-[10px] font-semibold text-primary">
                  {resolvedTheme === "dark" ? "다크 적용" : "화이트 적용"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-subtle p-1">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = mounted && theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTheme(option.id)}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-surface text-foreground shadow-2xs border border-line/70"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        isSelected ? "text-primary" : "text-muted"
                      }`}
                    />
                    <span>{option.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Detail Panel */}
        <div className="space-y-5 lg:col-span-8 xl:col-span-9">
          {activeSection === "profile" && (
            <>
              <SectionCard
                title="내 프로필 설정"
                description="코스·커플 스페이스·일기장에 표시되는 내 계정 정보를 관리합니다."
              >
                {isInitializing ? (
                  <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-line/70 bg-surface-subtle/40 p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2.5 text-xs font-bold text-muted">
                      프로필 정보를 불러오고 있어요...
                    </p>
                  </div>
                ) : !user ? (
                  <div className="rounded-xl border border-line bg-surface-subtle/50 p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-primary shadow-2xs">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3.5 text-sm font-black text-foreground">
                      로그인 후 내 프로필을 설정할 수 있어요
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      소셜 로그인으로 내 데이트 코스를 보관하고 닉네임과 프로필 이미지를 자유롭게 관리해 보세요.
                    </p>
                    <button
                      type="button"
                      onClick={openLoginModal}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-2xs transition-colors hover:bg-primary-hover"
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      <span>소셜 로그인으로 시작하기</span>
                    </button>
                  </div>
                ) : (
                  <ProfileEditForm
                    key={user.id}
                    user={user}
                    updateProfile={updateProfile}
                    logout={logout}
                  />
                )}
              </SectionCard>

              {/* Connected Account & Security Preview */}
              <SectionCard
                title="연동된 소셜 계정 및 보안"
                description="계정 인증 제공자와 현재 세션 상태를 확인합니다."
                rightNode={
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-subtle px-2.5 py-1 text-[10px] font-bold text-muted">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    <span>보안 상태 정상</span>
                  </span>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-surface-subtle/40 p-4">
                    <p className="text-[11px] font-bold text-muted">
                      연동된 OAuth 인증
                    </p>
                    <p className="mt-1 text-sm font-black text-foreground">
                      {user ? `${user.oauthProvider} 계정 연동됨` : "미연동 (게스트)"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {user
                        ? "안전한 토큰 기반 자동 갱신 세션이 활성화되어 있습니다."
                        : "카카오 또는 구글 계정으로 3초 만에 연동할 수 있습니다."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-subtle/40 p-4">
                    <p className="text-[11px] font-bold text-muted">
                      최근 접속 환경
                    </p>
                    <p className="mt-1 text-sm font-black text-foreground">
                      웹 브라우저 · 서울, KR
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      다기기 로그인 기록 및 세션 관리는 향후 업데이트에서 확장됩니다.
                    </p>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeSection === "appearance" && (
            <>
              <SectionCard
                title="화면 스타일"
                description="시간대와 주변 환경에 맞춰 눈이 편안한 테마를 선택하세요."
                rightNode={
                  mounted ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface-subtle px-2.5 py-1 text-[11px] font-bold text-foreground">
                      {resolvedTheme === "dark" ? (
                        <>
                          <Moon className="h-3 w-3 text-primary" />
                          <span>다크 모드 적용 중</span>
                        </>
                      ) : (
                        <>
                          <Sun className="h-3 w-3 text-primary" />
                          <span>화이트 모드 적용 중</span>
                        </>
                      )}
                    </span>
                  ) : null
                }
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {THEME_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = mounted && theme === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTheme(option.id)}
                        aria-pressed={isSelected}
                        className={`flex flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary-soft/50 shadow-2xs"
                            : "border-line bg-surface-subtle/45 hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <ThemePreviewSwatch mode={option.id} />
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-line bg-surface text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[2.5]" />
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Icon
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? "text-primary" : "text-muted"
                              }`}
                            />
                            <span className="text-xs font-extrabold text-foreground">
                              {option.label}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="지도 및 인터페이스 표시 옵션"
                description="탐색 지도와 타임라인에 표시되는 세부 스타일을 조정합니다."
              >
                <div className="space-y-3">
                  <PreviewNoticeBanner text="아래 인터페이스 세부 표시 옵션은 현재 미리보기 UI로 제공되며, 향후 계정 설정 저장과 연동됩니다." />

                  <SettingToggleRow
                    title="다크 모드 시 지도 야경 테마 자동 연동"
                    description="화면을 다크 모드로 전환하면 코스 지도를 미드나잇 야경 스타일로 맞춥니다."
                    checked={autoNightMap}
                    onToggle={() => setAutoNightMap((prev) => !prev)}
                  />

                  <SettingToggleRow
                    title="컴팩트 타임라인 카드 뷰"
                    description="코스 메이커와 보관함 카드의 여백을 줄여 한 화면에 더 많은 경유지를 표시합니다."
                    checked={compactTimeline}
                    onToggle={() => setCompactTimeline((prev) => !prev)}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-subtle/40 px-4 py-3.5">
                    <div>
                      <p className="text-xs font-bold text-foreground sm:text-sm">
                        경유지 간 이동 거리 표시 단위
                      </p>
                      <p className="text-xs text-muted">
                        동선 타임라인에 우선 표시할 이동 기준을 고릅니다.
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl border border-line bg-surface p-1">
                      <button
                        type="button"
                        onClick={() => setDistanceUnit("walk")}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                          distanceUnit === "walk"
                            ? "bg-primary text-white"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        도보 시간 우선 (분)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistanceUnit("meter")}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                          distanceUnit === "meter"
                            ? "bg-primary text-white"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        거리 우선 (m·km)
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeSection === "preferences" && (
            <SectionCard
              title="데이트 기본 취향"
              description="데이트 탐색 및 AI 코스 추천 시 기본값으로 활용할 선호 조건입니다."
            >
              <div className="space-y-5">
                <PreviewNoticeBanner text="기본 취향 프리셋은 현재 로컬 미리보기로 동작하며, 추후 사용자 맞춤형 추천 기본값으로 연동됩니다." />

                <div>
                  <p className="text-xs font-bold text-foreground">
                    기본 출발 주요 상권
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DEFAULT_REGIONS.map((region) => {
                      const active = defaultRegion === region;
                      return (
                        <button
                          key={region}
                          type="button"
                          onClick={() => {
                            setDefaultRegion(region);
                            setPrefSavedNotice(false);
                          }}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                            active
                              ? "bg-surface-dark text-white"
                              : "border border-line bg-surface-subtle text-muted hover:text-foreground"
                          }`}
                        >
                          {region}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-line/70 pt-4">
                  <p className="text-xs font-bold text-foreground">
                    기본 1인 데이트 예산
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DEFAULT_BUDGETS.map((budget) => {
                      const active = defaultBudget === budget;
                      return (
                        <button
                          key={budget}
                          type="button"
                          onClick={() => {
                            setDefaultBudget(budget);
                            setPrefSavedNotice(false);
                          }}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                            active
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-line bg-surface-subtle/50 text-muted hover:text-foreground"
                          }`}
                        >
                          {budget}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-line/70 pt-4">
                  <p className="text-xs font-bold text-foreground">
                    선호 코스 템포
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {DEFAULT_TEMPOS.map((tempo) => {
                      const active = defaultTempo === tempo;
                      return (
                        <button
                          key={tempo}
                          type="button"
                          onClick={() => {
                            setDefaultTempo(tempo);
                            setPrefSavedNotice(false);
                          }}
                          className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                            active
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-line bg-surface-subtle/50 text-muted hover:text-foreground"
                          }`}
                        >
                          {tempo}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SettingToggleRow
                  title="비 오는 날 실내 스팟 우선 추천"
                  description="강수 예보가 있거나 실내 데이트를 선호할 때 카페·전시·실내 공방을 우선으로 제안합니다."
                  checked={preferIndoorRainy}
                  onToggle={() => {
                    setPreferIndoorRainy((prev) => !prev);
                    setPrefSavedNotice(false);
                  }}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
                  <div>
                    {prefSavedNotice && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          취향 기본값이 현재 세션에 임시 적용되었습니다.
                        </span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrefSavedNotice(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-primary-hover"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>취향 기본값 임시 저장</span>
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {activeSection === "couple" && (
            <SectionCard
              title="커플 · 공개 범위"
              description="연인과의 코스 공유 방식과 디데이·일기장 노출 범위를 설정합니다."
            >
              <div className="space-y-3">
                <PreviewNoticeBanner text="커플 공유 및 공개 범위 옵션은 향후 커플 스페이스 정책과 연동될 예정입니다." />

                <SettingToggleRow
                  title="새 코스 작성 시 커플 스페이스 자동 공유"
                  description="커플로 연결된 상태에서 새로운 코스를 저장할 때 기본값으로 파트너에게 함께 노출합니다."
                  checked={autoShareCouple}
                  onToggle={() => setAutoShareCouple((prev) => !prev)}
                />

                <SettingToggleRow
                  title="공유 패스 링크에 예상 비용 노출"
                  description="카카오톡이나 URL로 코스를 공유할 때 2인 예상 예산 요약 정보를 함께 표시합니다."
                  checked={showCostOnShareLink}
                  onToggle={() => setShowCostOnShareLink((prev) => !prev)}
                />

                <SettingToggleRow
                  title="상단 헤더에 커플 펫 레벨 및 만남 횟수 배지 표시"
                  description="화면 상단에 현재 커플 펫 레벨과 만남 일수 퀵 배지를 표시합니다."
                  checked={showHeaderPetBadge}
                  onToggle={() => setShowHeaderPetBadge((prev) => !prev)}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-subtle/40 px-4 py-3.5">
                  <div>
                    <p className="text-xs font-bold text-foreground sm:text-sm">
                      데이트 일기장 기본 공개 범위
                    </p>
                    <p className="text-xs text-muted">
                      새 일기를 작성할 때 기본으로 적용되는 열람 권한입니다.
                    </p>
                  </div>
                  <div className="inline-flex rounded-xl border border-line bg-surface p-1">
                    <button
                      type="button"
                      onClick={() => setDiaryVisibility("couple")}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                        diaryVisibility === "couple"
                          ? "bg-primary text-white"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      우리 커플만 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiaryVisibility("private")}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                        diaryVisibility === "private"
                          ? "bg-primary text-white"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      작성자만 보기
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {activeSection === "notifications" && (
            <SectionCard
              title="알림 · 리마인더"
              description="데이트 예정일과 커플 활동 소식을 받을 알림 채널을 관리합니다."
            >
              <div className="space-y-3">
                <PreviewNoticeBanner text="알림 수신 설정은 추후 푸시/웹 알림 인프라 연동 시 그대로 반영될 예정입니다." />

                <SettingToggleRow
                  title="데이트 예정일 D-1 코스 리마인더 알림"
                  description="저장한 코스의 데이트 예정일 하루 전에 동선과 예상 일정을 요약해 알려드립니다."
                  checked={notifyDateReminder}
                  onToggle={() => setNotifyDateReminder((prev) => !prev)}
                />

                <SettingToggleRow
                  title="연인의 실시간 코스 공동편집 및 일기 등록 알림"
                  description="파트너가 함께 만드는 코스를 수정하거나 새 데이트 일기를 남기면 알림을 받습니다."
                  checked={notifyPartnerCollab}
                  onToggle={() => setNotifyPartnerCollab((prev) => !prev)}
                />

                <SettingToggleRow
                  title="커플 펫 오늘의 만남 인증 & 데일리 미션 알림"
                  description="하루 한 번 만남 인증과 데일리 미션 경험치 보상을 놓치지 않도록 알려줍니다."
                  checked={notifyPetMission}
                  onToggle={() => setNotifyPetMission((prev) => !prev)}
                />

                <SettingToggleRow
                  title="관심 지역 주말 행사·축제 및 팝업스토어 큐레이션"
                  description="자주 탐색하는 상권 주변의 신규 전시와 주말 페스티벌 정보를 받아봅니다."
                  checked={notifyFestivalNews}
                  onToggle={() => setNotifyFestivalNews((prev) => !prev)}
                />
              </div>
            </SectionCard>
          )}

          {activeSection === "data" && (
            <SectionCard
              title="데이터 · 관리"
              description="브라우저에 임시 저장된 코스 초안을 정리하거나 계정을 관리합니다."
            >
              <div className="space-y-4">
                {/* Real Local Draft Cache Reset */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle/40 p-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground sm:text-sm">
                        임시 담은 코스(Draft) 캐시 초기화
                      </span>
                      <span className="rounded-full border border-primary/25 bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                        {draftPlaces.length}곳 저장됨
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      데이트 탐색 화면에서 장바구니처럼 담아둔 미저장 경유지 목록을 비웁니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={draftPlaces.length === 0}
                    onClick={handleClearDrafts}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-foreground transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-45 dark:hover:border-red-800/70 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>임시 초안 비우기</span>
                  </button>
                </div>

                {draftClearedNotice && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Check className="h-3.5 w-3.5" />
                    <span>브라우저에 저장된 임시 코스 초안을 모두 비웠습니다.</span>
                  </p>
                )}

                {/* Dummy Data Export Preview */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle/40 p-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground sm:text-sm">
                        내 데이트 코스 & 일기 데이터 내보내기
                      </span>
                      <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                        향후 지원
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      보관함의 모든 코스(KML)와 커플 일기장 기록을 JSON/ZIP 아카이브로 백업합니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExportPreviewNotice(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-foreground transition-colors hover:bg-surface-subtle"
                  >
                    <Download className="h-3.5 w-3.5 text-primary" />
                    <span>데이터 아카이브 요청</span>
                  </button>
                </div>

                {exportPreviewNotice && (
                  <p className="rounded-xl border border-line bg-surface-subtle px-3.5 py-2.5 text-xs font-semibold text-muted">
                    데이터 아카이브 전체 내보내기는 추후 정식 지원 예정입니다. 개별 코스의 KML 내보내기는 코스 상세 페이지에서 바로 이용할 수 있습니다.
                  </p>
                )}

                {/* Logged-in Account Logout */}
                {user && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle/40 p-4">
                    <div>
                      <p className="text-xs font-bold text-foreground sm:text-sm">
                        현재 계정 로그아웃
                      </p>
                      <p className="text-xs text-muted">
                        현재 브라우저에서 {user.nickname} 계정의 인증 세션을 종료합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-muted transition-colors hover:border-red-300 hover:text-red-600 dark:hover:border-red-800/70 dark:hover:text-red-400"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
