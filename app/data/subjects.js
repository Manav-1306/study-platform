const computerScienceSubjects = [
  { name: "Discrete Maths", code: "UCS405", slug: "ucs405" },
  { name: "Probability and Statistics", code: "UMA401", slug: "uma401" },
  { name: "Operating System", code: "UCS303", slug: "ucs303" },
  { name: "Object Oriented Programming", code: "UTA018", slug: "uta018" },
  { name: "Numerical Linear Algebra", code: "UMA021", slug: "uma021" },
  { name: "Design and Analysis of Algorithms", code: "UCS415", slug: "ucs415" },
  { name: "Database Management Systems", code: "UCS310", slug: "ucs310" },
  { name: "Data Structures", code: "UCS301", slug: "ucs301" },
];

export const years = [
  {
    number: 1,
    label: "Year 1",
    groups: [
      {
        name: "Pool A",
        subjects: [
          { name: "Programming for Problem Solving", code: "UES103", slug: "ues103" },
          { name: "Energy and Environment", code: "UEN008", slug: "uen008" },
          { name: "Electrical & Electronics Engineering", code: "UES013", slug: "ues013" },
          { name: "Chemistry", code: "UCB009", slug: "ucb009" },
          { name: "Calculus for Engineers", code: "UMA022", slug: "uma022" },
        ],
      },
      {
        name: "Pool B",
        subjects: [
          { name: "Professional Communication", code: "UHU003", slug: "uhu003" },
          { name: "Physics", code: "UPH013", slug: "uph013" },
          { name: "Manufacturing Processes", code: "UES102", slug: "ues102" },
          { name: "Engineering Drawing", code: "UES101", slug: "ues101" },
          { name: "Differential Equations and Linear Algebra", code: "UMA023", slug: "uma023" },
        ],
      },
    ],
  },
  {
    number: 2,
    label: "Year 2",
    groups: [
      { name: "Computer Engineering", subjects: computerScienceSubjects },
      { name: "Computer Science & Engineering", subjects: computerScienceSubjects },
      {
        name: "Electrical Engineering",
        subjects: [
          { name: "Transmission & Distribution of Electric Current", code: "UEE307", slug: "uee307" },
          { name: "Optimization Techniques", code: "UMA035", slug: "uma035" },
          { name: "Network Theory", code: "UEE409", slug: "uee409" },
          { name: "Introduction to Measurement System", code: "UES302", slug: "ues302" },
          { name: "DC Machines", code: "UEE301", slug: "uee301" },
          { name: "Control System", code: "UEI501", slug: "uei501" },
          { name: "Aptitude Skills Building", code: "UTD003", slug: "utd003" },
          { name: "Analog Circuits", code: "UES301", slug: "ues301" },
          { name: "AC Machines", code: "UEE401", slug: "uee401" },
        ],
      },
      {
        name: "Electronics & Computer Engineering",
        subjects: [
          { name: "Signals & Systems", code: "UEC404", slug: "uec404" },
          { name: "OOPs", code: "UNC302", slug: "unc302" },
          { name: "Embedded Systems", code: "UEC513", slug: "uec513" },
          { name: "Computer & Communication Networks", code: "UNC303", slug: "unc303" },
          { name: "Analog Electronic Circuits", code: "UEC301", slug: "uec301" },
        ],
      },
    ],
  },
  {
    number: 3,
    label: "Year 3",
    groups: [{ name: "Coming soon", subjects: [] }],
  },
  {
    number: 4,
    label: "Year 4",
    groups: [{ name: "Coming soon", subjects: [] }],
  },
];

export function findSubjectBySlug(slug) {
  for (const year of years) {
    for (const group of year.groups) {
      const subject = group.subjects.find((item) => item.slug === slug);
      if (subject) return subject;
    }
  }

  return null;
}
