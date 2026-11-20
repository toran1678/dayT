interface PetStageIconProps {
  characterType?: string | null;
  className?: string;
  variant?: "badge" | "character";
}

function CompanionBadgeSvg({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Duo Interlocking Hearts Companion Badge */}
      <path
        d="M8.5 4.5C6.015 4.5 4 6.515 4 9c0 4.25 5.5 8.5 7.5 10 .324.243.676.243 1 0 2-1.5 7.5-5.75 7.5-10 0-2.485-2.015-4.5-4.5-4.5-1.74 0-3.24 1-3.9 2.45-.66-1.45-2.16-2.45-3.6-2.45z"
        fill="#DF5435"
      />
      {/* Sparkle Companion Accent */}
      <path
        d="M18.5 2.5L19.2 4L20.7 4.7L19.2 5.4L18.5 6.9L17.8 5.4L16.3 4.7L17.8 4L18.5 2.5Z"
        fill="#FBBF24"
      />
      <circle cx="8" cy="9" r="1.2" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

export function PetStageIcon({
  characterType,
  className = "h-5 w-5",
  variant = "character",
}: PetStageIconProps) {
  if (variant === "badge") {
    return <CompanionBadgeSvg className={className} />;
  }

  switch (characterType) {
    case "LOVEBIRD":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={className}
        >
          {/* Soft Glow */}
          <circle cx="32" cy="34" r="26" fill="#FEE2E2" opacity="0.5" />
          {/* Feather Crest */}
          <path
            d="M32 9C35.5 6 41 7 42 11.5C39 12.8 35.5 13.5 32 14Z"
            fill="#DF5435"
          />
          {/* Body */}
          <circle cx="32" cy="34" r="20" fill="#FBBF24" />
          {/* Tummy */}
          <path
            d="M18 35C18 44 24.5 50 33 50C41 50 47 44.5 48 36C43 39 37.5 40.5 31.5 40.5C25.5 40.5 21 38.5 18 35Z"
            fill="#FEF3C7"
          />
          {/* Wing */}
          <path
            d="M15 32C13 37 15 43 20.5 45C24 43 25.5 38 23.5 33C22 30 18 29.5 15 32Z"
            fill="#F59E0B"
          />
          {/* Eyes */}
          <circle cx="26" cy="30" r="2.5" fill="#1C1917" />
          <circle cx="27" cy="29" r="0.8" fill="#FFFFFF" />
          <circle cx="38" cy="30" r="2.5" fill="#1C1917" />
          <circle cx="39" cy="29" r="0.8" fill="#FFFFFF" />
          {/* Cheeks */}
          <ellipse cx="22" cy="34" rx="3" ry="2" fill="#FB7185" opacity="0.6" />
          <ellipse cx="42" cy="34" rx="3" ry="2" fill="#FB7185" opacity="0.6" />
          {/* Beak */}
          <path d="M29 32H35L32 37Z" fill="#DF5435" />
          {/* Love Heart Floating */}
          <path
            d="M48 15C46.3 13.3 43.7 13.7 43 15.7C42.3 13.7 39.7 13.3 38 15C36.3 16.8 37.2 19.8 43 23.5C48.8 19.8 49.7 16.8 48 15Z"
            fill="#E11D48"
          />
        </svg>
      );

    case "SWAN":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={className}
        >
          {/* Soft Lake Water Ring */}
          <ellipse cx="32" cy="48" rx="24" ry="7" fill="#E0F2FE" />
          {/* Swan Body */}
          <path
            d="M22 22C22 16 26.5 12 32 13C36 14 37.5 17.5 35.5 21C33.5 24 29 26 29 31C29 34 32 35 36.5 34.5C42.5 33.5 48 36 49 42C50 48 43 52 33 52C22 52 15 46.5 16 40C16.5 36 20 33.5 23 32.5C21.5 29 22 25 22 22Z"
            fill="#FFFFFF"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Wing Feathers */}
          <path
            d="M28 40C32.5 38 39 38.5 42.5 42.5C38.5 45.5 32 46 28 40Z"
            fill="#BAE6FD"
          />
          {/* Gold Crown */}
          <path d="M29.5 12L32 8L34.5 12.2Z" fill="#F59E0B" />
          {/* Orange Beak */}
          <path d="M36 17L42 19L36 21Z" fill="#DF5435" />
          {/* Eye */}
          <circle cx="33" cy="17.5" r="1.8" fill="#1C1917" />
          <circle cx="33.5" cy="17" r="0.6" fill="#FFFFFF" />
        </svg>
      );

    case "PHOENIX":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={className}
        >
          {/* Aura Radiance */}
          <circle cx="32" cy="32" r="28" fill="#FEF3C7" opacity="0.4" />
          {/* Outer Flame Feathers */}
          <path
            d="M32 8C36 14.5 41.5 18 52 16C50 26 45 32.5 52 38.5C44.5 41 40.5 47 32 54C23.5 47 19.5 41 12 38.5C19 32.5 14 26 12 16C22.5 18 28 14.5 32 8Z"
            fill="#DF5435"
          />
          {/* Inner Golden Wings */}
          <path
            d="M32 16C35 21 38.5 23.5 45 22.5C43.5 29 40.5 33 44.5 37C39.5 39 37 43 32 47.5C27 43 24.5 39 19.5 37C23.5 33 20.5 29 19 22.5C25.5 23.5 29 21 32 16Z"
            fill="#FBBF24"
          />
          {/* Face Core */}
          <circle cx="32" cy="32" r="7.5" fill="#FFFBEB" />
          <circle cx="29.5" cy="31.5" r="1.5" fill="#1C1917" />
          <circle cx="34.5" cy="31.5" r="1.5" fill="#1C1917" />
          <path d="M30.5 34H33.5L32 36.5Z" fill="#D97706" />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={className}
        >
          {/* Warm Background Halo */}
          <circle cx="32" cy="34" r="26" fill="#FEF08A" opacity="0.35" />
          {/* Little Sprout / Tuft */}
          <path
            d="M30 14C30 9.5 34 9.5 34 14"
            stroke="#CA8A04"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Chick Body */}
          <circle cx="32" cy="30" r="16" fill="#FACC15" />
          {/* Soft Tummy */}
          <ellipse cx="32" cy="36" rx="10" ry="8" fill="#FEF08A" />
          {/* Wings */}
          <ellipse cx="16" cy="32" rx="4" ry="3" fill="#EAB308" />
          <ellipse cx="48" cy="32" rx="4" ry="3" fill="#EAB308" />
          {/* Eyes */}
          <circle cx="26.5" cy="27" r="2.2" fill="#1C1917" />
          <circle cx="27.2" cy="26.2" r="0.7" fill="#FFFFFF" />
          <circle cx="37.5" cy="27" r="2.2" fill="#1C1917" />
          <circle cx="38.2" cy="26.2" r="0.7" fill="#FFFFFF" />
          {/* Cheeks */}
          <circle cx="22" cy="31" r="2.5" fill="#FB7185" opacity="0.55" />
          <circle cx="42" cy="31" r="2.5" fill="#FB7185" opacity="0.55" />
          {/* Beak */}
          <path d="M29.5 29.5H34.5L32 33.5Z" fill="#EA580C" />
          {/* Little Feet */}
          <path
            d="M27 46V50M37 46V50"
            stroke="#EA580C"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
