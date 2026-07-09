import { Link } from "react-router-dom";
import { primaryButtonClass } from "../lib/styles";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-indigo-200">404</p>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className={primaryButtonClass}>
        Back to the dashboard
      </Link>
    </main>
  );
}
