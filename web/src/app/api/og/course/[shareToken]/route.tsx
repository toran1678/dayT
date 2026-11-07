import { ImageResponse } from "next/og";
import { fetchCachedSharedCourse } from "@/features/courses/shared-course-og";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await context.params;
  const course = await fetchCachedSharedCourse(shareToken);

  const title = course?.title ?? "DayT 올인원 데이트 코스 패스";
  const subtitle =
    course?.description ??
    "식사부터 카페·전시·산책까지 도보 동선과 예상 예산을 한눈에 확인하세요.";
  const totalCostText = course
    ? `2인 약 ${course.totalEstimatedCost.toLocaleString()}원`
    : "맞춤 예산 리포트";
  const durationText = course
    ? `총 ${course.totalDurationMinutes}분 코스`
    : "최적 도보 동선";
  const stopLabels =
    course && course.places.length > 0
      ? course.places
          .slice(0, 4)
          .map((item) => `${item.visitOrder}. ${item.place.name}`)
      : ["1. 분위기 맛집", "2. 전시·산책 스팟", "3. 감성 로스터리 카페"];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          backgroundColor: "#FAF8F5",
          color: "#18181B",
        }}
      >
        {/* Top Brand Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                backgroundColor: "#E85D3F",
                color: "#FFFFFF",
                fontSize: "24px",
                fontWeight: 900,
              }}
            >
              D
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#18181B",
                }}
              >
                DayT DATE PASS
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#71717A",
                }}
              >
                ALL-IN-ONE DATE ITINERARY
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: "999px",
              backgroundColor: "#FDECE8",
              color: "#E85D3F",
              fontSize: "18px",
              fontWeight: 800,
            }}
          >
            {course?.sourceType === "AI_RECOMMENDED"
              ? "AI 추천 데이트 코스"
              : "공유된 데이트 코스"}
          </div>
        </div>

        {/* Main Title & Route Stops */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginTop: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "48px",
              fontWeight: 900,
              lineHeight: 1.2,
              color: "#18181B",
            }}
          >
            {title.length > 34 ? `${title.slice(0, 34)}...` : title}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 600,
              color: "#52525B",
            }}
          >
            {subtitle.length > 62 ? `${subtitle.slice(0, 62)}...` : subtitle}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "10px",
            }}
          >
            {stopLabels.map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 22px",
                  borderRadius: "18px",
                  backgroundColor: "#FFFFFF",
                  border: "2px solid #E4E4E7",
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#18181B",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Summary Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 32px",
            borderRadius: "24px",
            backgroundColor: "#18181B",
            color: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", gap: "28px", fontSize: "22px", fontWeight: 800 }}>
            <span style={{ color: "#FCD34D" }}>{totalCostText}</span>
            <span>·</span>
            <span>{durationText}</span>
          </div>
          <div style={{ display: "flex", fontSize: "18px", fontWeight: 700, color: "#E85D3F" }}>
            클릭해서 동선 지도 보기 →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

