"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { refreshAccessToken } from "@/lib/api";
import { saveAuthSession } from "@/lib/auth-session";
import { isSafeInternalPath } from "@/lib/safe-redirect";
import { useAuth } from "@/components/providers/auth-provider";

export function GoogleOAuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUser, updateWorkspace } = useAuth();

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      const error = searchParams.get("error");
      if (error) {
        toast.error("Google sign-in failed", {
          description: error.replace(/_/g, " "),
        });
        router.replace("/login");
        return;
      }

      const ok = searchParams.get("ok");
      if (ok !== "1") {
        router.replace("/login");
        return;
      }

      const session = await refreshAccessToken();
      if (cancelled) return;
      if (!session) {
        toast.error("Could not finish Google sign-in");
        router.replace("/login");
        return;
      }

      saveAuthSession(session);
      updateUser(session.user);
      updateWorkspace(session.workspace);
      const next = searchParams.get("next");
      router.replace(
        isSafeInternalPath(next)
          ? next
          : session.user.role === "ADMIN"
            ? "/admin"
            : "/"
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-8 animate-spin" />
      <p className="text-sm">Finishing Google sign-in…</p>
    </div>
  );
}
