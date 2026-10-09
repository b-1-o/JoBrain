import { prisma } from "@/lib/prisma";

export const ANALYTICS_RANGES = ["7d", "30d", "90d"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

const rangeDays: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const submittedStatuses = new Set(["APPLIED", "SCREENING", "TECH", "OFFER", "REJECTED"]);

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseAnalyticsRange(value: unknown): AnalyticsRange {
  return typeof value === "string" && ANALYTICS_RANGES.includes(value as AnalyticsRange)
    ? (value as AnalyticsRange)
    : "30d";
}

export async function buildApplicationAnalytics(userId: string, range: AnalyticsRange) {
  const days = rangeDays[range];
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const applications = await prisma.application.findMany({
    where: {
      userId,
      OR: [
        { createdAt: { gte: start } },
        { updatedAt: { gte: start } },
        { appliedAt: { gte: start } },
      ],
    },
    select: {
      status: true,
      createdAt: true,
      updatedAt: true,
      appliedAt: true,
    },
  });

  const byDay = new Map<string, { date: string; tracked: number; submitted: number }>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000);
    const key = dayKey(date);
    byDay.set(key, { date: key, tracked: 0, submitted: 0 });
  }

  let trackedCount = 0;
  let submittedCount = 0;

  for (const application of applications) {
    const createdKey = dayKey(application.createdAt);
    const createdBucket = byDay.get(createdKey);
    if (createdBucket) {
      createdBucket.tracked += 1;
      trackedCount += 1;
    }

    if (submittedStatuses.has(application.status)) {
      const submittedAt = application.appliedAt ?? application.updatedAt;
      const submittedBucket = byDay.get(dayKey(submittedAt));
      if (submittedBucket) {
        submittedBucket.submitted += 1;
        submittedCount += 1;
      }
    }
  }

  const series = [...byDay.values()];
  return {
    range,
    days,
    startDate: dayKey(start),
    endDate: dayKey(end),
    trackedCount,
    submittedCount,
    series,
  };
}
