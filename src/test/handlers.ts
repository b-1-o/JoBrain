import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://remoteok.com/api", () =>
    HttpResponse.json([
      {
        id: 101,
        slug: "remote-frontend",
        position: "Junior Frontend Developer",
        company: "Remote Fixtures",
        location: "Remote",
        description: "<p>React TypeScript</p>",
        tags: ["React", "TypeScript"],
        date: "2026-10-06T12:00:00.000Z",
        url: "https://remoteok.com/remote-jobs/101",
      },
    ]),
  ),
  http.get("https://remotive.com/api/remote-jobs", () =>
    HttpResponse.json({
      jobs: [
        {
          id: 102,
          title: "Frontend Engineer",
          company_name: "Remotive Fixtures",
          candidate_required_location: "Worldwide",
          description: "<p>Next.js React</p>",
          tags: ["Next.js"],
          url: "https://remotive.com/102",
          publication_date: "2026-10-05T12:00:00.000Z",
        },
      ],
    }),
  ),
  http.get("https://jobicy.com/api/v2/remote-jobs", () =>
    HttpResponse.json({
      jobs: [
        {
          id: 103,
          jobTitle: "React Developer",
          companyName: "Jobicy Fixtures",
          jobGeo: "USA",
          jobDescription: "<p>React</p>",
          jobIndustry: ["Software"],
          url: "https://jobicy.com/103",
          pubDate: "2026-10-04T12:00:00.000Z",
        },
      ],
    }),
  ),
  http.get("https://api.adzuna.com/v1/api/jobs/us/search/1", () =>
    HttpResponse.json({
      results: [
        {
          id: 104,
          title: "Web Developer",
          company: { display_name: "Adzuna Fixtures" },
          location: { display_name: "Los Angeles" },
          description: "TypeScript web developer",
          redirect_url: "https://adzuna.com/104",
          created: "2026-10-03T12:00:00.000Z",
        },
      ],
    }),
  ),
  http.get("https://serpapi.com/search.json", () =>
    HttpResponse.json({
      jobs_results: [
        {
          job_id: "google-105",
          title: "Junior UI Engineer",
          company_name: "Google Fixtures",
          location: "Remote",
          description: "React frontend",
          via: "LinkedIn",
          share_link: "https://google.com/jobs/105",
          extensions: ["React"],
        },
      ],
      serpapi_pagination: {},
    }),
  ),
];
