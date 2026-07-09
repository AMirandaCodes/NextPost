import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { applyValidationErrors, getApiErrorMessage } from "../lib/apiErrors";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "../lib/styles";

interface RegisterFormValues {
  full_name: string;
  email: string;
  password: string;
}

export function RegisterPage() {
  const { isAuthenticated, register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>();

  if (isAuthenticated) {
    return <Navigate to="/posts" replace />;
  }

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await registerAccount(values);
      navigate("/posts", { replace: true });
    } catch (error) {
      if (!applyValidationErrors(error, setError)) {
        setServerError(getApiErrorMessage(error, "Unable to register. Please try again."));
      }
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
          <h2 className="text-lg font-semibold">Create your account</h2>
          {serverError && (
            <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </p>
          )}
          <div>
            <label htmlFor="register-name" className={labelClass}>
              Full name
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              className={inputClass}
              aria-invalid={!!errors.full_name}
              {...register("full_name", {
                required: "Your name is required",
                maxLength: { value: 100, message: "Name must be 100 characters or fewer" },
              })}
            />
            {errors.full_name && <p className={errorTextClass}>{errors.full_name.message}</p>}
          </div>
          <div>
            <label htmlFor="register-email" className={labelClass}>
              Email
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              className={inputClass}
              aria-invalid={!!errors.email}
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className={errorTextClass}>{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="register-password" className={labelClass}>
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              aria-invalid={!!errors.password}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
                maxLength: { value: 72, message: "Password must be 72 characters or fewer" },
              })}
            />
            {errors.password && <p className={errorTextClass}>{errors.password.message}</p>}
          </div>
          <button type="submit" className={`${primaryButtonClass} w-full`} disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Register"}
          </button>
          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
