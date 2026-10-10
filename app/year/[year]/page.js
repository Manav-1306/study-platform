"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { years } from "../../data/subjects";

export default function YearPage() {
  const { year: yearParam } = useParams();
  const year = years.find((item) => String(item.number) === yearParam);
  const [selectedGroupName, setSelectedGroupName] = useState("");

  if (!year) notFound();

  const selectedGroup =
    year.groups.find((group) => group.name === selectedGroupName) ?? year.groups[0];

  return (
    <main className="min-h-screen bg-[#f8f7f3] px-6 py-10 text-slate-900 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
        >
          <span aria-hidden="true">←</span> All years
        </Link>

        <header className="mb-8 mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
            Study library
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">{year.label}</h1>
          <p className="mt-3 text-slate-600">
            Choose your pool or branch to browse its subjects.
          </p>
        </header>

        <div className="mb-8 max-w-md">
          <label
            htmlFor="subject-group"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Pool or branch
          </label>
          <select
            id="subject-group"
            value={selectedGroup?.name ?? ""}
            onChange={(event) => setSelectedGroupName(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          >
            {year.groups.map((group) => (
              <option key={group.name} value={group.name}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {selectedGroup?.subjects.length ? (
          <section aria-label={`${selectedGroup.name} subjects`}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
              <p className="text-sm text-slate-500">
                {selectedGroup.subjects.length} subjects
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedGroup.subjects.map((subject) => (
                <Link
                  key={subject.slug}
                  href={`/subject/${subject.slug}`}
                  className="group flex min-h-32 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
                >
                  <span>
                    <span className="block text-lg font-semibold text-slate-900">
                      {subject.name}
                    </span>
                    <span className="mt-2 inline-flex rounded-lg bg-violet-50 px-3 py-1 text-sm font-bold tracking-wide text-violet-700">
                      {subject.code}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-2xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600"
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <h2 className="text-xl font-semibold">Subjects coming soon</h2>
            <p className="mt-2 text-slate-600">
              We&apos;ll add the {year.label.toLowerCase()} subject list here.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
