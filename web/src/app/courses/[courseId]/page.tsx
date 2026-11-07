import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CourseDetailClientView } from "@/features/courses/CourseDetailClientView";

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

async function CourseDetailContent({ params }: CourseDetailPageProps) {
  const { courseId } = await params;
  return <CourseDetailClientView courseId={Number(courseId)} />;
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <CourseDetailContent params={params} />
    </Suspense>
  );
}
