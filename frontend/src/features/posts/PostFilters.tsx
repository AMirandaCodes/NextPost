import { inputClass, labelClass } from "../../lib/styles";
import { PLATFORM_LABELS, STATUS_LABELS, type Platform, type PostStatus, type Tag } from "../../types";

export interface PostFilterValues {
  search: string;
  platform: Platform | "";
  status: PostStatus | "";
  tag: string;
}

interface PostFiltersProps {
  values: PostFilterValues;
  tags: Tag[];
  onChange: (values: PostFilterValues) => void;
}

export function PostFilters({ values, tags, onChange }: PostFiltersProps) {
  function set<K extends keyof PostFilterValues>(key: K, value: PostFilterValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="filter-search" className={labelClass}>
          Search
        </label>
        <input
          id="filter-search"
          type="search"
          className={inputClass}
          placeholder="Search title or content…"
          value={values.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="filter-platform" className={labelClass}>
          Platform
        </label>
        <select
          id="filter-platform"
          className={inputClass}
          value={values.platform}
          onChange={(e) => set("platform", e.target.value as Platform | "")}
        >
          <option value="">All platforms</option>
          {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-status" className={labelClass}>
          Status
        </label>
        <select
          id="filter-status"
          className={inputClass}
          value={values.status}
          onChange={(e) => set("status", e.target.value as PostStatus | "")}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-tag" className={labelClass}>
          Tag
        </label>
        <select
          id="filter-tag"
          className={inputClass}
          value={values.tag}
          onChange={(e) => set("tag", e.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
