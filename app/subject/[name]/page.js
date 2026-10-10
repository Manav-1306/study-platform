import { notFound } from "next/navigation";
import { videosBySubject } from "../../data/videos";
import SubjectTabs from "./subject-tabs";

const subjectNames = {
  maths: "Maths",
  physics: "Physics",
  chemistry: "Chemistry",
  programming: "Programming",
};

export default async function SubjectPage({ params }) {
  const { name } = await params;
  const videos = videosBySubject[name];

  if (!subjectNames[name] || !videos) {
    notFound();
  }

  return <SubjectTabs name={subjectNames[name]} videos={videos} />;
}
