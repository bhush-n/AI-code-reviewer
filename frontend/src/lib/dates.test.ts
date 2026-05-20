import { describe, it, expect } from "vitest";
import { groupByDate } from "./dates";

const now = new Date("2026-05-20T10:00:00Z").toISOString();
const yesterday = new Date("2026-05-19T10:00:00Z").toISOString();
const last_week = new Date("2026-05-16T10:00:00Z").toISOString();
const older = new Date("2026-04-01T10:00:00Z").toISOString();

describe("groupByDate", () => {
  it("buckets reviews into Today, Yesterday, This week, Older", () => {
    const items = [
      { id: 1, created_at: now },
      { id: 2, created_at: yesterday },
      { id: 3, created_at: last_week },
      { id: 4, created_at: older },
    ];
    const out = groupByDate(items, new Date("2026-05-20T12:00:00Z"));
    expect(out.Today.map((x) => x.id)).toEqual([1]);
    expect(out.Yesterday.map((x) => x.id)).toEqual([2]);
    expect(out["This week"].map((x) => x.id)).toEqual([3]);
    expect(out.Older.map((x) => x.id)).toEqual([4]);
  });
});
