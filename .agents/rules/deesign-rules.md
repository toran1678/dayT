# Frontend Design & Code Constraints (Anti-AI Rules)

You must strictly adhere to these negative constraints when generating or modifying any UI/UX, CSS, or frontend code.

## 1. Visual & Styling Don'ts
- **NO Generic AI Gradients**: 절대 보라색-인디고(Violet/Indigo/Cyan) 계열의 네온 그라데이션, 거대한 블러 원형 조명(Glow Orb) 배경을 사용하지 마라.
- **NO Corner Radius Abuse**: 모든 카드, 버튼, 인풋에 무지성으로 `rounded-2xl`, `rounded-3xl`을 적용하지 마라. 기본적으로 6px ~ 10px(Tailwind 기준 `rounded-md`, `rounded-lg`)의 정제된 반경을 우선하라.
- **NO Cheap Flat Borders**: 컴포넌트 구분을 위해 두껍고 평면적인 `border-gray-200`을 남발하지 마라. 대신 은은한 헤어라인 테두리(`border-black/[0.08]` 또는 다크 모드 `border-white/[0.08]`)와 미세한 내부 그림자(inner shadow)를 사용하라.
- **NO Monotonous Fonts**: 기본 `Inter` 또는 `System UI` 폰트 단독으로만 밋밋하게 구성하지 마라. 명조/세리프(Serif) 포인트 폰트 혼용이나 명확한 웨이트 대비(Light vs Bold)를 부여하라.

## 2. Layout & Structure Don'ts
- **NO 3-Column Card Cliché**: '아이콘 + 굵은 제목 1줄 + 설명 2줄'로 이루어진 뻔한 3열 피처 그리드 패턴을 무비판적으로 배치하지 마라.
- **NO Rigid Symmetry**: 화면 전체를 완벽한 좌우 대칭 카드 격자로 채우지 마라. 중요도에 따른 Bento Grid 변형, 비대칭 스플릿, 타임라인형 가로/세로 리듬을 설계하라.
- **NO Meaningless Spacing**: 컴포넌트 간 여백(`gap`, `padding`)을 모두 동일한 16px/24px로 통일하지 마라. 밀도 있는 정보 영역과 시원하게 비워내는 매크로 여백의 대비를 분명히 줘라.

## 3. Copywriting & Content Don'ts
- **NO Corporate AI Fluff**: 'Unleash the power of...', 'Seamlessly integrate...', 'Supercharge your workflow...', 'The future of...' 같은 공허한 스타트업 클리셰 문구를 절대 쓰지 마라.
- **NO Vague Placeholders**: 버튼 텍스트를 단순 'Learn More', 'Get Started'로 퉁치지 말고, 실제 기능과 목적이 명확히 드러나는 실무적인 텍스트를 사용하라.

## 4. Animation & Interaction Don'ts
- **NO Sluggish Linear Animations**: 기본 `transition-all duration-300 ease-in-out`을 요소마다 덕지덕지 바르지 마라.
- **NO Overdone Bounce**: 촌스럽게 튀어오르는 과한 바운스 효과를 피하고, 150ms~200ms 내외의 짧고 정교한 스프링(Spring) 이징 및 은은한 피드백 모션만 허용하라.