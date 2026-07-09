import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils";
import { PostForm } from "./PostForm";

describe("PostForm", () => {
  it("requires a date when status is scheduled", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PostForm submitLabel="Save" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/title/i), "My post");
    await user.type(screen.getByLabelText(/content/i), "Hello world");
    await user.selectOptions(screen.getByLabelText(/platform/i), "linkedin");
    await user.selectOptions(screen.getByLabelText(/status/i), "scheduled");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("A scheduled post needs a date")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a payload with an ISO date and normalised tags", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<PostForm submitLabel="Save" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/title/i), "Launch day");
    await user.type(screen.getByLabelText(/content/i), "It is happening");
    await user.selectOptions(screen.getByLabelText(/platform/i), "x");
    await user.selectOptions(screen.getByLabelText(/status/i), "scheduled");
    await user.type(screen.getByLabelText(/scheduled for/i), "2030-06-15T09:30");
    await user.type(screen.getByLabelText(/tags/i), "Launch{Enter}");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.title).toBe("Launch day");
    expect(payload.platform).toBe("x");
    expect(payload.status).toBe("scheduled");
    expect(payload.tags).toEqual(["launch"]); // lowercased by the tag input
    expect(payload.scheduled_at).toBe(new Date("2030-06-15T09:30").toISOString());
  });

  it("removes a tag chip via its remove button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostForm submitLabel="Save" onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/tags/i), "one{Enter}two{Enter}");
    expect(screen.getByLabelText("Selected tags").children).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Remove tag one" }));
    expect(screen.getByLabelText("Selected tags").children).toHaveLength(1);
    expect(screen.queryByText("one")).not.toBeInTheDocument();
  });
});
