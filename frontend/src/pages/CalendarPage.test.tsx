import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format, setDate, startOfMonth } from "date-fns";
import type { Page, Post } from "../types";
import { renderWithProviders } from "../test/utils";
import { CalendarPage } from "./CalendarPage";

vi.mock("../api/posts");
import * as postsApi from "../api/posts";

// A fixed, timezone-safe moment on the 15th of the current month at 10:00 local time.
const fifteenth = setDate(startOfMonth(new Date()), 15);
fifteenth.setHours(10, 0, 0, 0);

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: "Calendar post",
    content: "Content",
    platform: "instagram",
    status: "scheduled",
    scheduled_at: fifteenth.toISOString(),
    published_at: null,
    image_path: null,
    tags: [],
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

function page(items: Post[]): Page<Post> {
  return { items, page: 1, page_size: 100, total: items.length };
}

describe("CalendarPage", () => {
  it("shows the current month and renders posts as chips on their day", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(page([makePost()]));
    renderWithProviders(<CalendarPage />);

    expect(screen.getByText(format(new Date(), "MMMM yyyy"))).toBeInTheDocument();
    const chip = await screen.findByRole("link", { name: "Calendar post" });
    expect(chip).toHaveAttribute("href", "/posts/1/edit");
  });

  it("announces post counts on the day buttons", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(
      page([makePost({ id: 1 }), makePost({ id: 2, title: "Second" })]),
    );
    renderWithProviders(<CalendarPage />);

    const label = `${format(fifteenth, "d MMMM yyyy")}, 2 posts`;
    expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
  });

  it("clicking a day opens a panel listing that day's posts", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(page([makePost({ title: "Day post" })]));
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(
      await screen.findByRole("button", { name: `${format(fifteenth, "d MMMM yyyy")}, 1 post` }),
    );

    const panel = screen.getByRole("region", { name: format(fifteenth, "EEEE d MMMM yyyy") });
    expect(within(panel).getByRole("link", { name: /day post/i })).toBeInTheDocument();
    expect(within(panel).getByText(/10:00/)).toBeInTheDocument();
  });

  it("navigates to the next month and requests its posts", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await screen.findByText(format(new Date(), "MMMM yyyy"));
    await user.click(screen.getByRole("button", { name: /next month/i }));

    const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    expect(screen.getByText(format(nextMonth, "MMMM yyyy"))).toBeInTheDocument();
  });

  it("shows an error state when loading fails", async () => {
    vi.mocked(postsApi.listPosts).mockRejectedValue(new Error("boom"));
    renderWithProviders(<CalendarPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the calendar.");
  });
});
