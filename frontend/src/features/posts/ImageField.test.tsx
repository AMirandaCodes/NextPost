import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils";
import { PostForm } from "./PostForm";

function makeFile(
  name = "photo.png",
  type = "image/png",
  bytes: number | undefined = undefined,
): File {
  const content = bytes ? new Uint8Array(bytes) : new Uint8Array([1, 2, 3]);
  return new File([content], name, { type });
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/title/i), "With image");
  await user.type(screen.getByLabelText(/content/i), "Body");
  await user.selectOptions(screen.getByLabelText(/platform/i), "instagram");
}

describe("PostForm image field", () => {
  it("previews a chosen file and passes it to onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<PostForm submitLabel="Save" onSubmit={onSubmit} />);

    const file = makeFile();
    await user.upload(screen.getByLabelText("Image"), file);

    expect(screen.getByAltText("Preview of photo.png")).toBeInTheDocument();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toEqual({ file, remove: false });
  });

  it("removes a selected file before saving", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<PostForm submitLabel="Save" onSubmit={onSubmit} />);

    await user.upload(screen.getByLabelText("Image"), makeFile());
    await user.click(screen.getByRole("button", { name: /remove image/i }));

    expect(screen.queryByAltText(/preview of/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no image selected/i)).toBeInTheDocument();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /save/i }));
    // Nothing was ever uploaded, so this is not a removal either.
    expect(onSubmit.mock.calls[0][1]).toEqual({ file: null, remove: false });
  });

  it("rejects files over the size limit with an error message", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PostForm submitLabel="Save" onSubmit={onSubmit} />);

    await user.upload(
      screen.getByLabelText("Image"),
      makeFile("huge.png", "image/png", 5 * 1024 * 1024 + 1),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Images must be 5 MB or smaller");
    expect(screen.queryByAltText(/preview of/i)).not.toBeInTheDocument();
  });

  it("rejects non-image file types", async () => {
    // user.upload honours the accept attribute unless applyAccept is disabled.
    const user = userEvent.setup({ applyAccept: false });
    renderWithProviders(<PostForm submitLabel="Save" onSubmit={vi.fn()} />);

    await user.upload(screen.getByLabelText("Image"), makeFile("run.exe", "application/octet-stream"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only JPEG, PNG, GIF or WebP images are allowed",
    );
  });
});
