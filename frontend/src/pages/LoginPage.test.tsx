import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosResponse } from "axios";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../test/utils";
import { LoginPage } from "./LoginPage";

vi.mock("../api/auth");
import * as authApi from "../api/auth";

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/posts" element={<div>Posts page</div>} />
    </Routes>,
    { route: "/login" },
  );
}

function axios401(detail: string): AxiosError {
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 401,
    data: { detail },
  } as AxiosResponse);
}

describe("LoginPage", () => {
  it("logs in, stores the token and redirects to the posts page", async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: "tok-123", token_type: "bearer" });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Posts page")).toBeInTheDocument();
    expect(localStorage.getItem("nextpost_token")).toBe("tok-123");
    expect(authApi.login).toHaveBeenCalledWith({
      email: "alice@example.com",
      password: "password123",
    });
  });

  it("shows the API error message when credentials are wrong", async () => {
    vi.mocked(authApi.login).mockRejectedValue(axios401("Incorrect email or password"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
    expect(localStorage.getItem("nextpost_token")).toBeNull();
  });

  it("validates required fields before calling the API", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });
});
