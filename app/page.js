import Link from "next/link";

const subjects = [
  {
    name: "Maths",
    slug: "maths",
    symbol: "∑",
    description: "Make sense of numbers, patterns, and big ideas.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    name: "Physics",
    slug: "physics",
    symbol: "◉",
    description: "Explore the forces and rules behind our world.",
    color: "bg-sky-100 text-sky-700",
  },
  {
    name: "Chemistry",
    slug: "chemistry",
    symbol: "⚗",
    description: "Discover what matter is made of and how it changes.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Programming",
    slug: "programming",
    symbol: "</>",
    description: "Build useful things one line of code at a time.",
    color: "bg-amber-100 text-amber-700",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-6 py-12 text-slate-900 sm:px-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
            Your learning space
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Study Platform
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Pick a subject and find notes, slides, and videos gathered in one
            place.
          </p>
        </header>

        <section aria-label="Subjects" className="grid gap-5 sm:grid-cols-2">
          {subjects.map((subject) => (
            <Link
              key={subject.slug}
              href={`/subject/${subject.slug}`}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 sm:p-8"
            >
              <div className="flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className={`flex size-14 items-center justify-center rounded-2xl text-xl font-bold ${subject.color}`}
                >
                  {subject.symbol}
                </span>
                <span
                  aria-hidden="true"
                  className="text-2xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600"
                >
                  →
                </span>
              </div>
              <h2 className="mt-7 text-2xl font-semibold">{subject.name}</h2>
              <p className="mt-2 leading-7 text-slate-600">
                {subject.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
