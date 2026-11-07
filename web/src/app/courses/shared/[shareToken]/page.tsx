import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CourseDetailClientView } from "@/features/courses/CourseDetailClientView";
import { fetchCachedSharedCourse } from "@/features/courses/shared-course-og";

interface SharedCoursePageProps {
  params: Promise<{ shareToken: string }>;
}

export async function generateMetadata({
  params,
}: SharedCoursePageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const course = await fetchCachedSharedCourse(shareToken);

  const title = course
    ? `${course.title} | DayT 데이트 코스 패스`
    : "공유된 데이트 코스 패스 | DayT";

  const routeLine =
    course && course.places.length > 0
      ? course.places
          .slice(0, 4)
          .map((p) => `${p.visitOrder}. ${p.place.name}`)
          .join(" → ")
      : "식사·카페·전시·산책 도보 동선과 예상 예산을 한눈에 확인하세요.";

  const description = course
    ? `${routeLine} · 2인 약 ${course.totalEstimatedCost.toLocaleString()}원 (${course.totalDurationMinutes}분)`
    : routeLine;

  const ogImageUrl = `/api/og/course/${encodeURIComponent(shareToken)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

async function SharedCourseContent({ params }: SharedCoursePageProps) {
  const { shareToken } = await params;
  return <CourseDetailClientView shareToken={shareToken} />;
}

export default function SharedCoursePage({ params }: SharedCoursePageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <SharedCourseContent params={params} />
    </Suspense>
  );
}
