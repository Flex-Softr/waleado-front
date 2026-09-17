import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const FEATURES = [
  "Official API & QR-based connectivity",
  "Broadcast campaigns to thousands",
  "Automated responses & chatbots",
  "Detailed analytics & insights",
] as const;

export function AuthMarketingPanel() {
  return (
    <div className="relative flex min-h-[240px] flex-col overflow-hidden px-8 py-10 text-foreground lg:min-h-screen lg:px-12 lg:py-12 xl:px-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.4), transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-1 flex-col">
        <Link
          href="/"
          className="mb-10 inline-flex w-fit items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          {/* Light theme logo (dark text) */}
          <Image
            src="/logo.png"
            alt="Waleado"
            width={160}
            height={44}
            className="h-9 w-auto object-contain dark:hidden"
            priority
          />
          {/* Dark theme logo (light text) */}
          <Image
            src="/logo.white.png"
            alt="Waleado"
            width={160}
            height={44}
            className="hidden h-9 w-auto object-contain dark:block"
            priority
          />
        </Link>

        <div className="max-w-md flex-1 space-y-8 lg:mt-6">
          <div className="space-y-4">
            <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15]">
              Grow your business with WhatsApp
            </h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground lg:text-base">
              Connect with customers, automate messages, and scale your
              marketing effortlessly.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map((line) => (
              <li key={line} className="flex gap-3 text-[15px] leading-snug">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ArrowRight className="size-3.5" strokeWidth={2.5} />
                </span>
                <span className="pt-0.5 text-foreground/90">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 mt-10 text-xs text-muted-foreground lg:mt-auto">
          © {new Date().getFullYear()} Waleado. All rights reserved.
        </p>
      </div>
    </div>
  );
}
