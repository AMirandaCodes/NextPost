import { isAxiosError } from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/** Human-readable message from an API error (FastAPI puts it in `detail`). */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isAxiosError(error)) {
    const detail: unknown = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

/**
 * Map FastAPI 422 validation errors onto react-hook-form fields.
 * Returns true if at least one field error was applied.
 */
export function applyValidationErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!isAxiosError(error) || error.response?.status !== 422) return false;
  const detail: unknown = error.response.data?.detail;
  if (!Array.isArray(detail)) return false;
  let applied = false;
  for (const item of detail) {
    const field = item?.loc?.[1];
    if (typeof field === "string" && typeof item?.msg === "string") {
      setError(field as Path<T>, { type: "server", message: item.msg });
      applied = true;
    }
  }
  return applied;
}
