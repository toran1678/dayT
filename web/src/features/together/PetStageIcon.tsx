interface PetStageIconProps {
  characterType?: string | null;
  className?: string;
}

export function PetStageIcon({
  characterType,
  className = "h-5 w-5",
}: PetStageIconProps) {
  switch (characterType) {
    case "LOVEBIRD":
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          {/* Crest */}
          <path
            d="M24 7C26.5 4.5 30.5 5 31 8.5C29 9.5 26.5 10 24 10.5Z"
            fill="#E85D3F"
          />
          {/* Body */}
          <circle cx="24" cy="24" r="14" fill="#FBBF24" />
          <path
            d="M14 25C14 31.5 18.8 36 25 36C31 36 35.5 31.8 36 25.5C32.5 28 28.5 29 24 29C19.5 29 16 27.5 14 25Z"
            fill="#FEF3C7"
          />
          {/* Wing */}
          <path
            d="M12 23C10.5 26.5 12 31 16 32.5C18.5 31 19.5 27.5 18 24C16.8 22 14 21.5 12 23Z"
            fill="#F59E0B"
          />
          {/* Eyes & Rosy Cheeks */}
          <circle cx="19.5" cy="21" r="1.8" fill="#1C1917" />
          <circle cx="28.5" cy="21" r="1.8" fill="#1C1917" />
          <circle cx="16.5" cy="24" r="2.2" fill="#FB7185" opacity="0.65" />
          <circle cx="31.5" cy="24" r="2.2" fill="#FB7185" opacity="0.65" />
          {/* Beak */}
          <path d="M22 22.5L26 22.5L24 26Z" fill="#E85D3F" />
          {/* Floating Heart */}
          <path
            d="M36.5 11.5C35.3 10.2 33.2 10.5 32.6 12.1C32 10.5 29.9 10.2 28.7 11.5C27.4 12.9 28 15.2 32.6 18.2C37.2 15.2 37.8 12.9 36.5 11.5Z"
            fill="#E11D48"
          />
        </svg>
      );

    case "SWAN":
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          {/* Soft Halo */}
          <circle cx="24" cy="25" r="17" fill="#E0F2FE" opacity="0.65" />
          {/* Swan Body & Neck */}
          <path
            d="M17 16C17 11.5 20.5 8.5 24.5 9.5C27.5 10.2 28.5 13 27 15.5C25.5 18 22 19.5 22 23C22 25.2 24.2 26 27.5 25.5C32 24.8 36.5 26.5 37 31C37.5 35.5 32.5 38.5 25 38.5C16.5 38.5 11.5 34.5 12 29.5C12.3 26.5 15 24.8 17.5 24C16.5 21.5 17 18.5 17 16Z"
            fill="#FFFFFF"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Wing Feather Curve */}
          <path
            d="M21 29.5C24.5 28 29.5 28.5 32 31.5C29 33.8 24 34 21 29.5Z"
            fill="#BAE6FD"
          />
          {/* Crown & Beak */}
          <path d="M22.5 9L24.5 6L26.5 9.2Z" fill="#F59E0B" />
          <path d="M27.5 12.5L32 14L27.5 15.5Z" fill="#E85D3F" />
          <circle cx="25" cy="12.8" r="1.3" fill="#1C1917" />
        </svg>
      );

    case "PHOENIX":
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          {/* Outer Flame Wings */}
          <path
            d="M24 6C27 11 31 13.5 39 12C37.5 19.5 34 24.5 39 29C33.5 31 30.5 35.5 24 41C17.5 35.5 14.5 31 9 29C14 24.5 10.5 19.5 9 12C17 13.5 21 11 24 6Z"
            fill="#E85D3F"
          />
          {/* Inner Golden Aura */}
          <path
            d="M24 12C26.2 15.8 29 17.5 34 16.8C32.8 21.8 30.5 25 33.5 28C29.8 29.5 27.8 32.5 24 36C20.2 32.5 18.2 29.5 14.5 28C17.5 25 15.2 21.8 14 16.8C19 17.5 21.8 15.8 24 12Z"
            fill="#FBBF24"
          />
          {/* Core Face */}
          <circle cx="24" cy="24.5" r="5.5" fill="#FFFBEB" />
          <circle cx="22" cy="24" r="1.2" fill="#1C1917" />
          <circle cx="26" cy="24" r="1.2" fill="#1C1917" />
          <path d="M22.8 25.8L25.2 25.8L24 27.8Z" fill="#D97706" />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          {/* Chick Head */}
          <circle cx="24" cy="20" r="11" fill="#FACC15" />
          {/* Little Tuft */}
          <path
            d="M22 9.5C22.5 6.8 25.5 6.8 26 9.5"
            stroke="#EAB308"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Wing Paws */}
          <ellipse cx="12.5" cy="23.5" rx="3" ry="2" fill="#FACC15" />
          <ellipse cx="35.5" cy="23.5" rx="3" ry="2" fill="#FACC15" />
          {/* Eyes & Beak */}
          <circle cx="20" cy="18.5" r="1.6" fill="#1C1917" />
          <circle cx="28" cy="18.5" r="1.6" fill="#1C1917" />
          <path d="M22 20L26 20L24 23Z" fill="#EA580C" />
          {/* Cracked Egg Shell Bottom */}
          <path
            d="M11 25L16.5 29L21 24.5L24 28.5L27.5 24.5L32 29L37 25C36.5 34.2 31 40 24 40C17 40 11.5 34.2 11 25Z"
            fill="#F5F3FF"
            stroke="#C4B5FD"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

