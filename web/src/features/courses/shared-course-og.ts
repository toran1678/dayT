import { cacheLife } from "next/cache";
import { fetchSharedCourseApi } from "./courses-api";
import type { CourseDetail } from "@/shared/api/types";

export async function fetchCachedSharedCourse(
  shareToken: string,
): Promise<CourseDetail | null> {
  "use cache";
  cacheLife("minutes");

  if (!shareToken) {
    return null;
  }

  try {
    return await fetchSharedCourseApi(shareToken);
  } catch {
    return null;
  }
}
