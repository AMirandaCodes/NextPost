import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { useCurrentUser } from "../hooks/useCurrentUser";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
  }`;

export function Layout() {
  const { logout } = useAuth();
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/posts" className="text-lg font-bold text-indigo-700">
              NextPost
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1">
              <NavLink to="/posts" className={navLinkClass}>
                Posts
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="hidden text-sm text-slate-600 sm:inline">{user.full_name}</span>}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
