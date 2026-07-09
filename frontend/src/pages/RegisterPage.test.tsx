import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosResponse } from "axios";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../test/utils";
import { RegisterPage } from "./RegisterPage";

vi.mock("../api/auth");
import * as authApi from "../api/auth";

function renderRegister() {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/posts" element={<div>Posts page</div>} />
    </Routes>,
    { route: "/register" },
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, password = "password123") {
  await user.type(screen.getByLabelText("Full name"), "New User");
  await user.type(screen.getByLabelText("Email"), "new@example.com");
  await user.type(screen.getByLabelText("Password"), password);
}

describe("RegisterPage", () => {
  it("registers, logs straight in, and redirects to the app", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: 2,
      email: "new@example.com",
      full_name: "New User",
      created_at: "2026-07-01T00:00:00Z",
    });
    vi.mocked(authApi.login).mockResolvedValue({ access_token: "tok", token_type: "bearer" });
    const user = userEvent.setup();
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Posts page")).toBeInTheDocument();
    expect(authApi.register).toHaveBeenCalledWith({
      full_name: "New User",
      email: "new@example.com",
      password: "password123",
    });
    expect(localStorage.getItem("nextpost_token")).toBe("tok");
  });

  it("shows the API message when the email is already registered", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409,
        data: { detail: "Email is already registered" },
      } as AxiosResponse),
    );
    const user = userEvent.setup();
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email is already registered");
  });

  it("rejects a short password before calling the API", async () => {
    const user = userEvent.setup();
    renderRegister();

    await fillForm(user, "short");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });
});
