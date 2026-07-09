import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/utils";
import { AuthImage } from "./AuthImage";

vi.mock("../api/posts");
import * as postsApi from "../api/posts";

describe("AuthImage", () => {
  it("renders the fetched image as an object URL", async () => {
    vi.mocked(postsApi.getPostImageBlob).mockResolvedValue(new Blob(["img"]));
    renderWithProviders(<AuthImage postId={1} imagePath="abc.png" alt="Current post image" />);

    const img = await screen.findByAltText("Current post image");
    expect(img).toHaveAttribute("src", expect.stringMatching(/^blob:/));
    expect(postsApi.getPostImageBlob).toHaveBeenCalledWith(1);
  });

  it("falls back gracefully when the image cannot be loaded", async () => {
    vi.mocked(postsApi.getPostImageBlob).mockRejectedValue(new Error("missing"));
    renderWithProviders(<AuthImage postId={1} imagePath="abc.png" alt="Current post image" />);

    expect(await screen.findByText("Image unavailable")).toBeInTheDocument();
  });
});
