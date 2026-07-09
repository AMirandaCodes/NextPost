import { useState, type KeyboardEvent } from "react";
import { inputClass } from "../../lib/styles";

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

/** Chip-style tag input: type a tag, press Enter (or comma) to add it. */
export function TagInput({ id, value, onChange, maxTags = 10 }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addDraft() {
    const name = draft.trim().toLowerCase();
    if (!name) return;
    if (!value.includes(name) && value.length < maxTags) {
      onChange([...value, name]);
    }
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Selected tags">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                className="rounded-full px-0.5 text-indigo-400 hover:text-indigo-700"
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="text"
        className={inputClass}
        placeholder="Add a tag and press Enter"
        value={draft}
        maxLength={50}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addDraft}
      />
    </div>
  );
}
