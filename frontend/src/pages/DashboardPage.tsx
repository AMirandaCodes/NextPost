import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/DataStates";
import { StatusBadge } from "../components/StatusBadge";
import { useDashboard } from "../hooks/useDashboard";
import { formatDateTime } from "../lib/dates";
import { PLATFORM_LABELS } from "../types";

export function DashboardPage() {
  const { data, isPending, isError, refetch } = useDashboard();

  if (isPending) return <LoadingState label="Loading dashboard…" />;
  if (isError) {
    return <ErrorState message="Could not load the dashboard." onRetry={() => void refetch()} />;
  }

  const stats = [
    { label: "Drafts", value: data.draft_count },
    { label: "Scheduled", value: data.scheduled_count },
    { label: "Published", value: data.published_count },
    { label: "Scheduled this week", value: data.posts_this_week },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <dt className="text-sm font-medium text-slate-500">{stat.label}</dt>
            <dd className="mt-1 text-3xl font-bold text-slate-900">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="upcoming-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="upcoming-heading" className="text-lg font-semibold">
            Upcoming posts
          </h2>
          <Link to="/calendar" className="text-sm font-medium text-indigo-600 hover:underline">
            View calendar
          </Link>
        </div>
        {data.upcoming_posts.length === 0 ? (
          <EmptyState title="Nothing scheduled yet">
            <Link to="/posts/new" className="font-medium text-indigo-600 hover:underline">
              Schedule your first post
            </Link>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
            {data.upcoming_posts.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/posts/${post.id}/edit`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{post.title}</span>
                    <span className="text-sm text-slate-500">
                      {PLATFORM_LABELS[post.platform]} · {formatDateTime(post.scheduled_at)}
                    </span>
                  </span>
                  <StatusBadge status={post.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
