import { screen } from "@testing-library/react";
import type { DashboardStats, Post } from "../types";
import { renderWithProviders } from "../test/utils";
import { DashboardPage } from "./DashboardPage";

vi.mock("../api/dashboard");
import * as dashboardApi from "../api/dashboard";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: "Upcoming post",
    content: "Content",
    platform: "linkedin",
    status: "scheduled",
    scheduled_at: "2026-07-10T09:00:00Z",
    published_at: null,
    image_path: null,
    tags: [],
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

function stats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    total_posts: 6,
    draft_count: 3,
    scheduled_count: 2,
    published_count: 1,
    posts_this_week: 4,
    upcoming_posts: [],
    ...overrides,
  };
}

describe("DashboardPage", () => {
  it("shows the summary counts", async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(stats());
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Drafts")).toBeInTheDocument();
    expect(screen.getByText("Drafts").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("Scheduled").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Published").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Scheduled this week").nextElementSibling).toHaveTextContent("4");
  });

  it("lists upcoming posts as links to the edit page", async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(
      stats({ upcoming_posts: [makePost({ id: 42, title: "Launch teaser" })] }),
    );
    renderWithProviders(<DashboardPage />);

    const link = await screen.findByRole("link", { name: /launch teaser/i });
    expect(link).toHaveAttribute("href", "/posts/42/edit");
  });

  it("shows an empty state when nothing is scheduled", async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(stats());
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Nothing scheduled yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /schedule your first post/i })).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    vi.mocked(dashboardApi.getDashboard).mockRejectedValue(new Error("boom"));
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the dashboard.");
  });
});
