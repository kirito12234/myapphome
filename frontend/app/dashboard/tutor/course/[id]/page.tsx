import TeacherCourseDetailPage from "../../../_components/TeacherCourseDetailPage";

export default function TutorCourseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const returnTo = typeof searchParams?.returnTo === "string" ? searchParams.returnTo : "";
  return <TeacherCourseDetailPage courseId={params.id} returnTo={returnTo} />;
}
