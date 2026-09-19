import * as React from "react";

export function WhmcsLogo({ className = "size-8" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white shadow-md ring-1 ring-blue-500/20 ${className}`}
      aria-label="WHMCS Logo"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-3/4"
      >
        <rect width="48" height="48" rx="10" fill="transparent" />
        {/* WHMCS Stylized Monogram */}
        <path
          d="M8 14L14 34L20 20L24 28L28 20L34 34L40 14"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="12" r="3" fill="#38bdf8" />
        <path
          d="M16 38H32"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function WordPressLogo({ className = "size-8" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0073aa] via-[#005177] to-slate-900 text-white shadow-md ring-1 ring-sky-500/20 ${className}`}
      aria-label="WordPress Logo"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-3/4"
      >
        <rect width="48" height="48" rx="10" fill="transparent" />
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <path
          d="M13 24C13 30.0751 17.9249 35 24 35C27.1354 35 29.9697 33.6874 31.9688 31.5714L20.25 15.75L13 24Z"
          fill="currentColor"
          fillOpacity="0.25"
        />
        <path
          d="M14.5 17.5L21 34.5L25 24.5L22 17.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 17.5L30.5 26.5L33.5 17.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 34.5L28.5 22.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function CustomApiLogo({ className = "size-8" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-md ring-1 ring-emerald-500/20 ${className}`}
      aria-label="Custom API Logo"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-3/4"
      >
        <rect width="48" height="48" rx="10" fill="transparent" />
        <path
          d="M14 18L8 24L14 30"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M34 18L40 24L34 30"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 13L21 35"
          stroke="#34d399"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
