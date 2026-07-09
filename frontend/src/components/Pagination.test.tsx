import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("describes the visible range and navigates in both directions", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={2} pageSize={20} total={154} onPageChange={onPageChange} />);

    expect(screen.getByText(/showing/i).textContent).toBe("Showing 21–40 of 154");
    expect(screen.getByText("Page 2 of 8")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables Previous on the first page and Next on the last", () => {
    const { rerender } = render(
      <Pagination page={1} pageSize={20} total={154} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    rerender(<Pagination page={8} pageSize={20} total={154} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("handles an empty result set", () => {
    render(<Pagination page={1} pageSize={20} total={0} onPageChange={vi.fn()} />);
    expect(screen.getByText(/showing/i).textContent).toBe("Showing 0–0 of 0");
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });
});
