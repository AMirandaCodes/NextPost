import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosResponse } from "axios";
import { renderWithProviders } from "../test/utils";
import { ProfilePage } from "./ProfilePage";

vi.mock("../api/auth");
import * as authApi from "../api/auth";

const alice = {
  id: 1,
  email: "alice@example.com",
  full_name: "Alice Example",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  localStorage.setItem("nextpost_token", "tok"); // ProfilePage's ["me"] query needs auth
  vi.mocked(authApi.getMe).mockResolvedValue(alice);
});

describe("ProfilePage", () => {
  it("prefills the form with the current profile", async () => {
    renderWithProviders(<ProfilePage />);
    expect(await screen.findByLabelText("Full name")).toHaveValue("Alice Example");
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
  });

  it("updates the profile and confirms success", async () => {
    vi.mocked(authApi.updateMe).mockResolvedValue({ ...alice, full_name: "Alice Renamed" });
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    const name = await screen.findByLabelText("Full name");
    await user.clear(name);
    await user.type(name, "Alice Renamed");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
    expect(authApi.updateMe).toHaveBeenCalledWith({
      full_name: "Alice Renamed",
      email: "alice@example.com",
    });
  });

  it("shows the API error when the current password is wrong", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      new AxiosError("Bad request", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 400,
        data: { detail: "Current password is incorrect" },
      } as AxiosResponse),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.type(await screen.findByLabelText("Current password"), "wrong-pass");
    await user.type(screen.getByLabelText("New password"), "new-password-1");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect");
  });

  it("clears the password fields after a successful change", async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.type(await screen.findByLabelText("Current password"), "password123");
    await user.type(screen.getByLabelText("New password"), "new-password-1");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("Password changed.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });
});
