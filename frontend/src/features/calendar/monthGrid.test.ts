import { format } from "date-fns";
import { buildMonthGrid } from "./monthGrid";

describe("buildMonthGrid", () => {
  it("produces full weeks starting on Monday", () => {
    // July 2026 starts on a Wednesday and ends on a Friday.
    const weeks = buildMonthGrid(new Date(2026, 6, 1));

    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(format(week[0], "EEE")).toBe("Mon");
      expect(format(week[6], "EEE")).toBe("Sun");
    }
    expect(format(weeks[0][0], "yyyy-MM-dd")).toBe("2026-06-29"); // leading June days
    expect(format(weeks.at(-1)![6], "yyyy-MM-dd")).toBe("2026-08-02"); // trailing August days
  });

  it("contains every day of the month exactly once", () => {
    const weeks = buildMonthGrid(new Date(2026, 1, 1)); // February 2026
    const keys = weeks.flat().map((d) => format(d, "yyyy-MM-dd"));
    for (let day = 1; day <= 28; day++) {
      const key = `2026-02-${String(day).padStart(2, "0")}`;
      expect(keys.filter((k) => k === key)).toHaveLength(1);
    }
  });

  it("handles a month that fits exactly in weeks", () => {
    // June 2026: 1st is a Monday, 30 days → exactly 5 weeks... actually 5 rows.
    const weeks = buildMonthGrid(new Date(2026, 5, 15));
    expect(format(weeks[0][0], "yyyy-MM-dd")).toBe("2026-06-01");
    expect(weeks.flat()).toHaveLength(weeks.length * 7);
  });
});
