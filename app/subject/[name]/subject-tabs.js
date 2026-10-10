"use client";

import Link from "next/link";
import { useState } from "react";
import FocusTimer from "./focus-timer";

const tabs = ["Notes", "Slides", "Books", "PYQs", "Tutorials", "Lab", "Videos"];

export default function SubjectTabs({ name, code, videos }) {
  const [activeTab, setActiveTab] = useState("Notes");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedVideo = videos[selectedIndex] ?? videos[0];

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
            Subject library
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">{name}</h1>
          <p className="mt-3 inline-flex rounded-lg bg-violet-100 px-3 py-1 text-sm font-bold tracking-wide text-violet-800">
            {code}
          </p>
          <p className="mt-3 text-slate-600">
            Browse learning materials for {name.toLowerCase()}.
          </p>
        </header>

        <div className="mb-8">
          <FocusTimer />
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            aria-label={`${name} materials`}
            className="flex gap-2 overflow-x-auto border-b border-slate-200 px-4 pt-4 sm:px-6"
            role="tablist"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                id={`tab-${tab.toLowerCase()}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls="subject-panel"
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                  activeTab === tab
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div
            id="subject-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab.toLowerCase()}`}
            className="p-5 sm:p-8"
          >
            {activeTab !== "Videos" && (
              <div className="rounded-2xl bg-slate-50 p-6 sm:p-8">
                <h2 className="text-xl font-semibold">{activeTab}</h2>
                <p className="mt-2 leading-7 text-slate-600">Coming soon</p>
              </div>
            )}

            {activeTab === "Videos" && videos.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 sm:p-8">
                <h2 className="text-xl font-semibold">Videos</h2>
                <p className="mt-2 leading-7 text-slate-600">Coming soon</p>
              </div>
            )}

            {activeTab === "Videos" && videos.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)]">
                <div>
                  <div className="aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-sm">
                    <iframe
                      key={selectedVideo.id}
                      className="h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${selectedVideo.id}?rel=0`}
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">
                    {selectedVideo.title}
                  </h2>
                  <p className="mt-2 leading-7 text-slate-600">
                    {selectedVideo.description}
                  </p>
                </div>

                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Video library
                  </h2>
                  <ul className="space-y-2">
                    {videos.map((video, index) => (
                      <li key={video.id}>
                        <button
                          type="button"
                          aria-pressed={selectedIndex === index}
                          onClick={() => setSelectedIndex(index)}
                          className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                            selectedIndex === index
                              ? "border-violet-300 bg-violet-50"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="block font-semibold text-slate-900">
                            {video.title}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">
                            {video.description}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Only videos listed in the approved library can be selected.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
