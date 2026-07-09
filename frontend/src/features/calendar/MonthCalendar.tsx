import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { Link } from "react-router-dom";
import type { Post, PostStatus } from "../../types";
import { buildMonthGrid, dayKey } from "./monthGrid";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS_PER_DAY = 3;

const chipStyles: Record<PostStatus, string> = {
  draft: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  scheduled: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  published: "bg-green-100 text-green-800 hover:bg-green-200",
};

interface MonthCalendarProps {
  month: Date;
  postsByDay: Map<string, Post[]>;
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
}

export function MonthCalendar({ month, postsByDay, selectedDay, onSelectDay }: MonthCalendarProps) {
  const weeks = buildMonthGrid(month);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Posts scheduled in {format(month, "MMMM yyyy")}</caption>
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((label) => (
              <th
                key={label}
                scope="col"
                className="border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={dayKey(week[0])}>
              {week.map((day) => {
                const posts = postsByDay.get(dayKey(day)) ?? [];
                const inMonth = isSameMonth(day, month);
                const isSelected = selectedDay !== null && isSameDay(day, selectedDay);
                return (
                  <td
                    key={dayKey(day)}
                    className={`h-28 border border-slate-100 p-1 align-top ${
                      inMonth ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDay(day)}
                      aria-label={`${format(day, "d MMMM yyyy")}${
                        posts.length > 0
                          ? `, ${posts.length} ${posts.length === 1 ? "post" : "posts"}`
                          : ""
                      }`}
                      aria-current={isToday(day) ? "date" : undefined}
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : isToday(day)
                            ? "bg-indigo-100 text-indigo-700"
                            : inMonth
                              ? "text-slate-700 hover:bg-slate-100"
                              : "text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {format(day, "d")}
                    </button>
                    <ul className="mt-1 space-y-0.5">
                      {posts.slice(0, MAX_CHIPS_PER_DAY).map((post) => (
                        <li key={post.id}>
                          <Link
                            to={`/posts/${post.id}/edit`}
                            title={post.title}
                            className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium ${chipStyles[post.status]}`}
                          >
                            {post.title}
                          </Link>
                        </li>
                      ))}
                      {posts.length > MAX_CHIPS_PER_DAY && (
                        <li>
                          <button
                            type="button"
                            onClick={() => onSelectDay(day)}
                            className="px-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            +{posts.length - MAX_CHIPS_PER_DAY} more
                          </button>
                        </li>
                      )}
                    </ul>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
