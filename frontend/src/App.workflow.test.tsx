import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Post, User } from "./types";
import { AppRoutes } from "./App";
import { renderWithProviders } from "./test/utils";

vi.mock("./api/auth");
vi.mock("./api/posts");
vi.mock("./api/tags");
vi.mock("./api/dashboard");
import * as authApi from "./api/auth";
import * as dashboardApi from "./api/dashboard";
import * as postsApi from "./api/posts";
import * as tagsApi from "./api/tags";

const alice: User = {
  id: 1,
  email: "alice@example.com",
  full_name: "Alice Example",
  created_at: "2026-01-01T00:00:00Z",
};

/** An in-memory posts store standing in for the backend, so the workflow test
 *  exercises real pages, routing, forms and cache invalidation together. */
function setupFakeBackend() {
  let posts: Post[] = [];
  let nextId = 1;

  vi.mocked(authApi.login).mockResolvedValue({ access_token: "tok", token_type: "bearer" });
  vi.mocked(authApi.getMe).mockResolvedValue(alice);
  vi.mocked(tagsApi.listTags).mockResolvedValue([]);
  vi.mocked(dashboardApi.getDashboard).mockImplementation(async () => ({
    total_posts: posts.length,
    draft_count: posts.filter((p) => p.status === "draft").length,
    scheduled_count: posts.filter((p) => p.status === "scheduled").length,
    published_count: posts.filter((p) => p.status === "published").length,
    posts_this_week: 0,
    upcoming_posts: [],
  }));
  vi.mocked(postsApi.listPosts).mockImplementation(async () => ({
    items: [...posts],
    page: 1,
    page_size: 20,
    total: posts.length,
  }));
  vi.mocked(postsApi.getPost).mockImplementation(async (id) => {
    const post = posts.find((p) => p.id === id);
    if (!post) throw new Error("not found");
    return { ...post };
  });
  vi.mocked(postsApi.createPost).mockImplementation(async (payload) => {
    const post: Post = {
      id: nextId++,
      title: payload.title,
      content: payload.content,
      platform: payload.platform,
      status: payload.status,
      scheduled_at: payload.scheduled_at,
      published_at: null,
      image_path: null,
      tags: payload.tags.map((name, i) => ({ id: i + 1, name })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    posts.push(post);
    return { ...post };
  });
  vi.mocked(postsApi.updatePost).mockImplementation(async (id, payload) => {
    const post = posts.find((p) => p.id === id)!;
    Object.assign(post, payload, {
      tags: (payload.tags ?? post.tags.map((t) => t.name)).map(
        (name: string, i: number) => ({ id: i + 1, name }),
      ),
    });
    return { ...post };
  });
  vi.mocked(postsApi.deletePost).mockImplementation(async (id) => {
    posts = posts.filter((p) => p.id !== id);
  });
}

describe("post management workflow", () => {
  it(
    "logs in, creates a post, edits it, and deletes it",
    async () => {
      setupFakeBackend();
      const user = userEvent.setup();
      renderWithProviders(<AppRoutes />, { route: "/login" });

      // --- log in
      await user.type(await screen.findByLabelText("Email"), "alice@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      // --- lands on the posts list, empty
      expect(await screen.findByText("No posts yet")).toBeInTheDocument();

      // --- create a post
      await user.click(screen.getByRole("link", { name: "New post" }));
      await user.type(await screen.findByLabelText("Title"), "Workflow post");
      await user.type(screen.getByLabelText("Content"), "Written by the workflow test");
      await user.selectOptions(screen.getByLabelText("Platform"), "linkedin");
      await user.type(screen.getByLabelText("Tags"), "demo{Enter}");
      await user.click(screen.getByRole("button", { name: "Create post" }));

      // --- back on the list with the new post
      expect(await screen.findByText("Workflow post")).toBeInTheDocument();
      expect(screen.getByText("demo")).toBeInTheDocument();

      // --- edit it
      await user.click(screen.getByRole("link", { name: "Edit" }));
      const title = await screen.findByLabelText("Title");
      expect(title).toHaveValue("Workflow post");
      await user.clear(title);
      await user.type(title, "Workflow post, revised");
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(await screen.findByText("Workflow post, revised")).toBeInTheDocument();

      // --- delete it, confirming in the dialog
      await user.click(screen.getByRole("button", { name: "Delete" }));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Delete" }));

      expect(await screen.findByText("No posts yet")).toBeInTheDocument();
      expect(vi.mocked(postsApi.deletePost)).toHaveBeenCalledWith(1);
    },
    20000,
  );

  it(
    "redirects an unauthenticated visitor to login, and back after logging in",
    async () => {
      setupFakeBackend();
      const user = userEvent.setup();
      renderWithProviders(<AppRoutes />, { route: "/profile" });

      // Guarded route bounces to /login…
      expect(await screen.findByRole("button", { name: "Log in" })).toBeInTheDocument();

      await user.type(screen.getByLabelText("Email"), "alice@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      // …and returns to the originally requested page afterwards.
      expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    },
    20000,
  );
});
