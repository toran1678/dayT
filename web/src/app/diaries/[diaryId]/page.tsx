import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DiaryDetailClientView } from "@/features/diaries/DiaryDetailClientView";

interface DiaryDetailPageProps {
  params: Promise<{ diaryId: string }>;
}

async function DiaryDetailContent({ params }: DiaryDetailPageProps) {
  const { diaryId } = await params;
  return <DiaryDetailClientView diaryId={Number(diaryId)} />;
}

export default function DiaryDetailPage({ params }: DiaryDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <DiaryDetailContent params={params} />
    </Suspense>
  );
}

