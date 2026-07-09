# ADR 0008 — Custom month calendar instead of a calendar library

**Date:** 2026-07-09 · **Status:** Accepted

## Context

The calendar view has four requirements: a monthly grid, month navigation, click a day to
see its posts, click a post to open it. Explicitly out of scope: drag-and-drop, week/day
views, resizing, recurring events. The obvious library, `react-big-calendar`, exists
primarily to provide those excluded features — plus a localizer abstraction and its own
stylesheet that competes with Tailwind. Lighter packages (`react-calendar`,
`react-day-picker`) are date *pickers*: rendering posts inside day cells would need as much
custom work as building the grid.

## Decision

Build the month view directly: `date-fns` (already a dependency) computes the visible
weeks (`buildMonthGrid`, Monday-start), and a presentational `MonthCalendar` component
renders them as a semantic `<table>` — weekday `<th>` headers, a caption, day-number
buttons with post counts in their accessible names, and post chips as links.
Data comes from the existing `GET /posts` endpoint using its `scheduled_from`/`scheduled_to`
range filter; no calendar-specific backend was added.

## Consequences

- ~150 lines of owned, fully styleable, testable code versus a large dependency configured
  mostly to switch features off.
- Timezone handling is trivially correct: `new Date(iso)` is local time, so posts land on
  the user's local day with no extra machinery.
- If richer interactions (drag-to-reschedule, week view) are ever wanted, that's the point
  to adopt `react-big-calendar` rather than grow this component into one.
- The month query caps at the list endpoint's `page_size=100`; a month with more than 100
  scheduled posts would truncate. Accepted as far beyond realistic usage for this tool.
