import { addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/DataStates";
import { StatusBadge } from "../components/StatusBadge";
import { MonthCalendar } from "../features/calendar/MonthCalendar";
import { dayKey, WEEK_STARTS_ON } from "../features/calendar/monthGrid";
import { usePostsList } from "../hooks/usePosts";
import { secondaryButtonClass } from "../lib/styles";
import { PLATFORM_LABELS, type Post } from "../types";

export function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // The visible grid includes leading/trailing days of adjacent months.
  const gridStart = startOfWeek(month, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });

  const { data, isPending, isError, refetch } = usePostsList({
    scheduled_from: gridStart.toISOString(),
    scheduled_to: gridEnd.toISOString(),
    page_size: 100,
    sort_by: "scheduled_at",
    sort_order: "asc",
  });

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of data?.items ?? []) {
      if (!post.scheduled_at) continue;
      // new Date(iso) is the user's local timezone, so posts land on the local day.
      const key = dayKey(new Date(post.scheduled_at));
      map.set(key, [...(map.get(key) ?? []), post]);
    }
    return map;
  }, [data]);

  function changeMonth(next: Date) {
    setMonth(next);
    setSelectedDay(null);
  }

  const selectedPosts = selectedDay ? (postsByDay.get(dayKey(selectedDay)) ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => changeMonth(addMonths(month, -1))}
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">Previous month</span>
          </button>
          <span aria-live="polite" className="min-w-36 text-center font-semibold">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => changeMonth(addMonths(month, 1))}
          >
            <span aria-hidden="true">→</span>
            <span className="sr-only">Next month</span>
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => changeMonth(startOfMonth(new Date()))}
          >
            Today
          </button>
        </div>
      </div>

      {isPending ? (
        <LoadingState label="Loading calendar…" />
      ) : isError ? (
        <ErrorState message="Could not load the calendar." onRetry={() => void refetch()} />
      ) : (
        <>
          <MonthCalendar
            month={month}
            postsByDay={postsByDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          {selectedDay && (
            <section
              aria-labelledby="day-panel-heading"
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h2 id="day-panel-heading" className="font-semibold">
                {format(selectedDay, "EEEE d MMMM yyyy")}
              </h2>
              {selectedPosts.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No posts scheduled on this day.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {selectedPosts.map((post) => (
                    <li key={post.id}>
                      <Link
                        to={`/posts/${post.id}/edit`}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-900">
                            {post.title}
                          </span>
                          <span className="text-sm text-slate-500">
                            {format(new Date(post.scheduled_at!), "HH:mm")} ·{" "}
                            {PLATFORM_LABELS[post.platform]}
                          </span>
                        </span>
                        <StatusBadge status={post.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
