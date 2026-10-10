import { notFound } from "next/navigation";
import { findSubjectBySlug } from "../../data/subjects";
import { videosBySubject } from "../../data/videos";
import SubjectTabs from "./subject-tabs";

export default async function SubjectPage({ params }) {
  const { name: slug } = await params;
  const subject = findSubjectBySlug(slug);

  if (!subject) notFound();

  return (
    <SubjectTabs
      name={subject.name}
      code={subject.code}
      videos={videosBySubject[subject.slug] ?? []}
    />
  );
}
