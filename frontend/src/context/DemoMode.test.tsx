import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { Layout } from "../components/Layout";
import { renderWithProviders } from "../test/utils";

vi.mock("../api/auth");
import * as authApi from "../api/auth";

describe("demo mode", () => {
  it("logs visitors in automatically behind a splash screen", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.mocked(authApi.demoLogin).mockResolvedValue({
      access_token: "demo-token",
      token_type: "bearer",
    });

    renderWithProviders(<div>App content</div>);

    // Splash first, then the app once the token arrives.
    expect(screen.getByText("Preparing your demo…")).toBeInTheDocument();
    expect(await screen.findByText("App content")).toBeInTheDocument();
    expect(localStorage.getItem("nextpost_token")).toBe("demo-token");
  });

  it("offers a retry when the demo server does not respond", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.mocked(authApi.demoLogin)
      .mockRejectedValueOnce(new Error("cold start timeout"))
      .mockResolvedValueOnce({ access_token: "demo-token", token_type: "bearer" });
    const user = userEvent.setup();

    renderWithProviders(<div>App content</div>);

    expect(await screen.findByRole("alert")).toHaveTextContent(/didn't respond/);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("App content")).toBeInTheDocument();
  });

  it("shows the sandbox banner and hides logout in the layout", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.mocked(authApi.demoLogin).mockResolvedValue({
      access_token: "demo-token",
      token_type: "bearer",
    });
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: 1,
      email: "demo@nextpost.dev",
      full_name: "Demo User",
      created_at: "2026-01-01T00:00:00Z",
    });

    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>Page body</div>} />
        </Route>
      </Routes>,
    );

    expect(await screen.findByText(/shared sandbox that resets every hour/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("does nothing outside demo builds", () => {
    renderWithProviders(<div>App content</div>);
    expect(screen.getByText("App content")).toBeInTheDocument();
    expect(authApi.demoLogin).not.toHaveBeenCalled();
  });
});
