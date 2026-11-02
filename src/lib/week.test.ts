import { describe, expect, it } from "vitest";
import { shiftWeek, weekDays, weekStartFor } from "./week";
import { localDateString } from "./utils";

describe("week helpers", () => {
  it("finds the week start for Monday and Sunday weeks", () => {
    expect(weekStartFor("2026-11-05", 1)).toBe("2026-11-02"); // Thu -> Mon
    expect(weekStartFor("2026-11-02", 1)).toBe("2026-11-02");
    expect(weekStartFor("2026-11-05", 0)).toBe("2026-11-01"); // -> Sun
  });
  it("lists 7 days across a month boundary", () => {
    expect(weekDays("2026-11-30")).toEqual(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
  });
  it("shifts weeks", () => {
    expect(shiftWeek("2026-11-02", -1)).toBe("2026-10-26");
  });
  it("uses the Singapore calendar date, not UTC", () => {
    // 2026-11-02 17:30 UTC is already 3 Nov in Singapore; toISOString() would say the 2nd.
    expect(localDateString(new Date(Date.UTC(2026, 10, 2, 17, 30)))).toBe("2026-11-03");
  });
});
