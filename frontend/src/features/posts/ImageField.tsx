import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AuthImage } from "../../components/AuthImage";
import { errorTextClass, labelClass, secondaryButtonClass } from "../../lib/styles";
import type { Post } from "../../types";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // mirrors the backend limit
const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp";

export interface ImageSelection {
  file: File | null; // a newly chosen file to upload after saving
  remove: boolean; // true when the existing image should be deleted
}

interface ImageFieldProps {
  post?: Post; // present on the edit form
  value: ImageSelection;
  onChange: (value: ImageSelection) => void;
}

export function ImageField({ post, value, onChange }: ImageFieldProps) {
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(
    () => (value.file ? URL.createObjectURL(value.file) : null),
    [value.file],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const hasExistingImage = Boolean(post?.image_path) && !value.remove;
  const showsImage = value.file !== null || hasExistingImage;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
      setError("Only JPEG, PNG, GIF or WebP images are allowed");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Images must be 5 MB or smaller");
      return;
    }
    onChange({ file, remove: false });
  }

  function handleRemove() {
    setError(null);
    onChange({ file: null, remove: post?.image_path != null });
  }

  return (
    <div>
      <label htmlFor="post-image" className={labelClass}>
        Image
      </label>

      {value.file && previewUrl ? (
        <img
          src={previewUrl}
          alt={`Preview of ${value.file.name}`}
          className="mb-3 max-h-56 rounded-md border border-slate-200 object-contain"
        />
      ) : hasExistingImage && post ? (
        <AuthImage
          postId={post.id}
          imagePath={post.image_path!}
          alt="Current post image"
          className="mb-3 max-h-56 min-h-16 w-auto min-w-32 rounded-md border border-slate-200 object-contain"
        />
      ) : (
        <p className="mb-3 rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
          No image selected. One image per post, up to 5 MB.
        </p>
      )}

      <div className="flex items-center gap-3">
        <input
          id="post-image"
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
        />
        {showsImage && (
          <button type="button" onClick={handleRemove} className={secondaryButtonClass}>
            Remove image
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className={errorTextClass}>
          {error}
        </p>
      )}
    </div>
  );
}
