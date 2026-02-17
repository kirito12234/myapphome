import CourseDetailPage from "../../../_components/CourseDetailPage";

export default function StudentCourseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const returnTo = typeof searchParams?.returnTo === "string" ? searchParams.returnTo : "";
  return <CourseDetailPage role="student" courseId={params.id} returnTo={returnTo} />;
}








