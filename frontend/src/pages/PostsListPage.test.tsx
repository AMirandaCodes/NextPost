import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Page, Post } from "../types";
import { renderWithProviders } from "../test/utils";
import { PostsListPage } from "./PostsListPage";

vi.mock("../api/posts");
vi.mock("../api/tags");
import * as postsApi from "../api/posts";
import * as tagsApi from "../api/tags";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: "A post",
    content: "Content",
    platform: "linkedin",
    status: "draft",
    scheduled_at: null,
    published_at: null,
    image_path: null,
    tags: [],
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

function page(items: Post[]): Page<Post> {
  return { items, page: 1, page_size: 20, total: items.length };
}

beforeEach(() => {
  vi.mocked(tagsApi.listTags).mockResolvedValue([]);
});

describe("PostsListPage", () => {
  it("renders posts returned by the API", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(
      page([
        makePost({ id: 1, title: "First post", status: "scheduled" }),
        makePost({ id: 2, title: "Second post", platform: "x" }),
      ]),
    );
    renderWithProviders(<PostsListPage />);

    const firstRow = (await screen.findByText("First post")).closest("tr")!;
    expect(within(firstRow).getByText("Scheduled")).toBeInTheDocument();
    const secondRow = screen.getByText("Second post").closest("tr")!;
    expect(within(secondRow).getByText("X (Twitter)")).toBeInTheDocument();
  });

  it("shows an empty state with a create link when there are no posts", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(page([]));
    renderWithProviders(<PostsListPage />);

    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create your first post/i })).toBeInTheDocument();
  });

  it("shows an error state when the API fails", async () => {
    vi.mocked(postsApi.listPosts).mockRejectedValue(new Error("boom"));
    renderWithProviders(<PostsListPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your posts.");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("deletes a post only after confirmation", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(page([makePost({ id: 7, title: "Doomed" })]));
    vi.mocked(postsApi.deletePost).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/permanently deleted/i)).toBeInTheDocument();
    expect(postsApi.deletePost).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(postsApi.deletePost).toHaveBeenCalledWith(7);
  });

  it("does not delete when the dialog is cancelled", async () => {
    vi.mocked(postsApi.listPosts).mockResolvedValue(page([makePost({ id: 7, title: "Safe" })]));
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(postsApi.deletePost).not.toHaveBeenCalled();
  });
});
