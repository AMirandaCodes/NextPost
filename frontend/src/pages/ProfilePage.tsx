import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as authApi from "../api/auth";
import { ErrorState, LoadingState } from "../components/DataStates";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { applyValidationErrors, getApiErrorMessage } from "../lib/apiErrors";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "../lib/styles";
import type { User } from "../types";

export function ProfilePage() {
  const { data: user, isPending, isError, refetch } = useCurrentUser();

  if (isPending) return <LoadingState label="Loading profile…" />;
  if (isError || !user) {
    return <ErrorState message="Could not load your profile." onRetry={() => void refetch()} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <ProfileDetailsForm user={user} />
      <ChangePasswordForm />
    </div>
  );
}

function ProfileDetailsForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ full_name: string; email: string }>({
    defaultValues: { full_name: user.full_name, email: user.email },
  });

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      const updated = await authApi.updateMe(values);
      queryClient.setQueryData(["me"], updated);
      setMessage({ kind: "success", text: "Profile updated." });
    } catch (error) {
      if (!applyValidationErrors(error, setError)) {
        setMessage({ kind: "error", text: getApiErrorMessage(error) });
      }
    }
  });

  return (
    <section
      aria-labelledby="profile-details-heading"
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="profile-details-heading" className="text-lg font-semibold">
        Details
      </h2>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`rounded-md px-4 py-3 text-sm ${
              message.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}
          >
            {message.text}
          </p>
        )}
        <div>
          <label htmlFor="profile-name" className={labelClass}>
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            className={inputClass}
            aria-invalid={!!errors.full_name}
            {...register("full_name", { required: "Your name is required" })}
          />
          {errors.full_name && <p className={errorTextClass}>{errors.full_name.message}</p>}
        </div>
        <div>
          <label htmlFor="profile-email" className={labelClass}>
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            autoComplete="email"
            className={inputClass}
            aria-invalid={!!errors.email}
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className={errorTextClass}>{errors.email.message}</p>}
        </div>
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ChangePasswordForm() {
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ current_password: string; new_password: string }>();

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await authApi.changePassword(values);
      reset();
      setMessage({ kind: "success", text: "Password changed." });
    } catch (error) {
      setMessage({
        kind: "error",
        text: getApiErrorMessage(error, "Could not change your password."),
      });
    }
  });

  return (
    <section
      aria-labelledby="change-password-heading"
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="change-password-heading" className="text-lg font-semibold">
        Change password
      </h2>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`rounded-md px-4 py-3 text-sm ${
              message.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}
          >
            {message.text}
          </p>
        )}
        <div>
          <label htmlFor="current-password" className={labelClass}>
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            aria-invalid={!!errors.current_password}
            {...register("current_password", { required: "Enter your current password" })}
          />
          {errors.current_password && (
            <p className={errorTextClass}>{errors.current_password.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="new-password" className={labelClass}>
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            aria-invalid={!!errors.new_password}
            {...register("new_password", {
              required: "Enter a new password",
              minLength: { value: 8, message: "Password must be at least 8 characters" },
              maxLength: { value: 72, message: "Password must be 72 characters or fewer" },
            })}
          />
          {errors.new_password && <p className={errorTextClass}>{errors.new_password.message}</p>}
        </div>
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}
