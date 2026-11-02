import { describe, expect, it } from "vitest";
import { findTimers, formatClock } from "./timers";

describe("step timers", () => {
  it("finds simple and ranged durations", () => {
    expect(findTimers("Simmer for 10 minutes.")).toEqual([{ label: "10 minutes", seconds: 600 }]);
    expect(findTimers("Bake 25–30 mins until golden")[0].seconds).toBe(1800);
    expect(findTimers("Rest 1 hr 20 min")[0].seconds).toBe(4800);
    expect(findTimers("Blanch for 30 seconds, then 2 minutes in ice water").map((t) => t.seconds)).toEqual([30, 120]);
  });
  it("ignores things that aren't durations", () => {
    expect(findTimers("Add 2 tbsp oil and 3 eggs")).toEqual([]);
    expect(findTimers("Cut into 2 cm pieces")).toEqual([]);
  });
  it("formats a clock", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});
