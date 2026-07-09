import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { getApiErrorMessage } from "../lib/apiErrors";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "../lib/styles";

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  if (isAuthenticated) {
    return <Navigate to="/posts" replace />;
  }

  const from: string = location.state?.from ?? "/posts";

  const submit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Unable to log in. Please try again."));
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-indigo-700">NextPost</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Plan your social media posts</p>
        <form
          onSubmit={submit}
          noValidate
          className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Log in</h2>
          {serverError && (
            <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </p>
          )}
          <div>
            <label htmlFor="login-email" className={labelClass}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className={inputClass}
              aria-invalid={!!errors.email}
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className={errorTextClass}>{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="login-password" className={labelClass}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              aria-invalid={!!errors.password}
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && <p className={errorTextClass}>{errors.password.message}</p>}
          </div>
          <button type="submit" className={`${primaryButtonClass} w-full`} disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
          <p className="text-center text-sm text-slate-600">
            No account yet?{" "}
            <Link to="/register" className="font-medium text-indigo-600 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
