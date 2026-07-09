// Shared Tailwind class strings — enough consistency without component wrappers.

export const inputClass =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm " +
  "shadow-sm placeholder:text-slate-400 " +
  "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50";

export const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export const errorTextClass = "mt-1 text-sm text-red-600";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 " +
  "text-sm font-medium text-white shadow-sm hover:bg-indigo-700 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white " +
  "px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 " +
  "text-sm font-medium text-white shadow-sm hover:bg-red-700 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60";
