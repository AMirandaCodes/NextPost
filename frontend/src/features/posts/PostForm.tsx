import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { PostPayload } from "../../api/posts";
import { applyValidationErrors, getApiErrorMessage } from "../../lib/apiErrors";
import { fromDatetimeLocal, toDatetimeLocal } from "../../lib/dates";
import {
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../../lib/styles";
import { PLATFORM_LABELS, STATUS_LABELS, type Platform, type Post, type PostStatus } from "../../types";
import { ImageField, type ImageSelection } from "./ImageField";
import { TagInput } from "./TagInput";

interface PostFormValues {
  title: string;
  content: string;
  platform: Platform | "";
  status: PostStatus;
  scheduled_at: string; // datetime-local value, "" when unset
  tags: string[];
}

interface PostFormProps {
  initial?: Post;
  submitLabel: string;
  onSubmit: (payload: PostPayload, image: ImageSelection) => Promise<unknown>;
}

export function PostForm({ initial, submitLabel, onSubmit }: PostFormProps) {
  const navigate = useNavigate();
  const [rootError, setRootError] = useState<string | null>(null);
  const [image, setImage] = useState<ImageSelection>({ file: null, remove: false });
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    defaultValues: {
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      platform: initial?.platform ?? "",
      status: initial?.status ?? "draft",
      scheduled_at: toDatetimeLocal(initial?.scheduled_at ?? null),
      tags: initial?.tags.map((t) => t.name) ?? [],
    },
  });
  const status = watch("status");
  const content = watch("content");

  const submit = handleSubmit(async (values) => {
    setRootError(null);
    try {
      await onSubmit(
        {
          title: values.title.trim(),
          content: values.content,
          platform: values.platform as Platform, // validated as required below
          status: values.status,
          scheduled_at: fromDatetimeLocal(values.scheduled_at),
          tags: values.tags,
        },
        image,
      );
    } catch (error) {
      if (!applyValidationErrors(error, setError)) {
        setRootError(getApiErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {rootError && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {rootError}
        </p>
      )}

      <div>
        <label htmlFor="post-title" className={labelClass}>
          Title
        </label>
        <input
          id="post-title"
          type="text"
          className={inputClass}
          aria-invalid={!!errors.title}
          {...register("title", {
            required: "Title is required",
            maxLength: { value: 200, message: "Title must be 200 characters or fewer" },
          })}
        />
        {errors.title && <p className={errorTextClass}>{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="post-content" className={labelClass}>
          Content
        </label>
        <textarea
          id="post-content"
          rows={6}
          className={inputClass}
          aria-invalid={!!errors.content}
          {...register("content", {
            required: "Content is required",
            maxLength: { value: 5000, message: "Content must be 5000 characters or fewer" },
          })}
        />
        <div className="mt-1 flex justify-between">
          {errors.content ? (
            <p className={errorTextClass.replace("mt-1 ", "")}>{errors.content.message}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-slate-400">{content.length}/5000</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="post-platform" className={labelClass}>
            Platform
          </label>
          <select
            id="post-platform"
            className={inputClass}
            aria-invalid={!!errors.platform}
            {...register("platform", { required: "Choose a platform" })}
          >
            <option value="">Select a platform…</option>
            {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.platform && <p className={errorTextClass}>{errors.platform.message}</p>}
        </div>

        <div>
          <label htmlFor="post-status" className={labelClass}>
            Status
          </label>
          <select id="post-status" className={inputClass} {...register("status")}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="post-scheduled-at" className={labelClass}>
          Scheduled for
        </label>
        <input
          id="post-scheduled-at"
          type="datetime-local"
          className={inputClass}
          aria-invalid={!!errors.scheduled_at}
          {...register("scheduled_at", {
            validate: (value) =>
              status !== "scheduled" || value !== "" || "A scheduled post needs a date",
          })}
        />
        {errors.scheduled_at && <p className={errorTextClass}>{errors.scheduled_at.message}</p>}
      </div>

      <div>
        <label htmlFor="post-tags" className={labelClass}>
          Tags
        </label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput id="post-tags" value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <ImageField post={initial} value={image} onChange={setImage} />

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button type="button" className={secondaryButtonClass} onClick={() => navigate("/posts")}>
          Cancel
        </button>
        <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
