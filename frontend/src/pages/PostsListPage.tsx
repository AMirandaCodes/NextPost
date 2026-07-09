import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { PostListParams } from "../api/posts";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "../components/DataStates";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { PostFilters, type PostFilterValues } from "../features/posts/PostFilters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useDeletePost, usePostsList } from "../hooks/usePosts";
import { useTags } from "../hooks/useTags";
import { formatDateTime } from "../lib/dates";
import { primaryButtonClass } from "../lib/styles";
import { PLATFORM_LABELS, type Post } from "../types";

type SortBy = NonNullable<PostListParams["sort_by"]>;

const PAGE_SIZE = 20;
const EMPTY_FILTERS: PostFilterValues = { search: "", platform: "", status: "", tag: "" };

export function PostsListPage() {
  const [filters, setFilters] = useState<PostFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ by: SortBy; order: "asc" | "desc" }>({
    by: "created_at",
    order: "desc",
  });
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search);
  const params = useMemo<PostListParams>(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      platform: filters.platform || undefined,
      status: filters.status || undefined,
      tag: filters.tag || undefined,
      sort_by: sort.by,
      sort_order: sort.order,
    }),
    [page, debouncedSearch, filters.platform, filters.status, filters.tag, sort],
  );

  const { data, isPending, isError, refetch } = usePostsList(params);
  const { data: tags = [] } = useTags();
  const deleteMutation = useDeletePost();

  const hasActiveFilters =
    filters.search !== "" || filters.platform !== "" || filters.status !== "" || filters.tag !== "";

  function handleFiltersChange(next: PostFilterValues) {
    setFilters(next);
    setPage(1);
  }

  function toggleSort(column: SortBy) {
    setSort((current) =>
      current.by === column
        ? { by: column, order: current.order === "asc" ? "desc" : "asc" }
        : { by: column, order: "asc" },
    );
    setPage(1);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link to="/posts/new" className={primaryButtonClass}>
          New post
        </Link>
      </div>

      <PostFilters values={filters} tags={tags} onChange={handleFiltersChange} />

      {isPending ? (
        <LoadingState label="Loading posts…" />
      ) : isError ? (
        <ErrorState message="Could not load your posts." onRetry={() => void refetch()} />
      ) : data.total === 0 ? (
        hasActiveFilters ? (
          <EmptyState title="No posts match your filters">
            Try clearing the search or choosing different filters.
          </EmptyState>
        ) : (
          <EmptyState title="No posts yet">
            <Link to="/posts/new" className="font-medium text-indigo-600 hover:underline">
              Create your first post
            </Link>
          </EmptyState>
        )
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <SortableHeader label="Title" column="title" sort={sort} onSort={toggleSort} />
                  <th scope="col" className="px-4 py-3">
                    Platform
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <SortableHeader
                    label="Scheduled"
                    column="scheduled_at"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th scope="col" className="px-4 py-3">
                    Tags
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50">
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">
                      {post.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{PLATFORM_LABELS[post.platform]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(post.scheduled_at)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {post.tags.length > 0 ? post.tags.map((t) => t.name).join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/posts/${post.id}/edit`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(post)}
                        className="ml-4 font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this post?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently deleted. This cannot be undone.`
            : ""
        }
        busy={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SortableHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SortBy;
  sort: { by: SortBy; order: "asc" | "desc" };
  onSort: (column: SortBy) => void;
}) {
  const isActive = sort.by === column;
  const ariaSort = isActive ? (sort.order === "asc" ? "ascending" : "descending") : undefined;
  return (
    <th scope="col" className="px-4 py-3" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800"
      >
        {label}
        <span aria-hidden="true">{isActive ? (sort.order === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}
