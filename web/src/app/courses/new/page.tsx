import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CourseBuilderClientView } from "@/features/courses/CourseBuilderClientView";

export default function CourseBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <CourseBuilderClientView />
    </Suspense>
  );
}
