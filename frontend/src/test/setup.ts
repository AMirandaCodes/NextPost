import "@testing-library/jest-dom/vitest";

// jsdom does not implement <dialog>'s modal API yet.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom does not implement object URLs.
if (!URL.createObjectURL) {
  let counter = 0;
  URL.createObjectURL = () => `blob:mock-${++counter}`;
  URL.revokeObjectURL = () => {};
}

afterEach(() => {
  localStorage.clear();
});
