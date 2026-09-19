"use client";

import * as React from "react";
import Link from "next/link";
import { Blocks, BookOpen, Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  OPEN_API_AUTH_HEADERS,
  OPEN_API_COMMON_ERRORS,
  OPEN_API_ENDPOINTS,
  OPEN_API_ERROR_FORMAT,
  OPEN_API_FLOW_STEPS,
  OPEN_API_RESPONSE_FORMAT,
  type OpenApiEndpointDoc,
} from "@/features/api-docs/content/open-api-endpoints";
import { getApiBaseUrl } from "@/lib/api-config";
import { cn } from "@/lib/utils";

function methodBadgeClass(method: OpenApiEndpointDoc["method"]): string {
  switch (method) {
    case "GET":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "POST":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
    case "PATCH":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "DELETE":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    default:
      return "";
  }
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

export function ApiDocsClient() {
  let baseUrl = "https://your-api.example.com";
  try {
    baseUrl = getApiBaseUrl();
  } catch {
    /* build-time / missing env fallback */
  }

  const curlSingle = `curl -X POST "${baseUrl}/v1/open/messages/single" \\
  -H "X-Client-Id: fw_cid_..." \\
  -H "X-Client-Secret: fw_csec_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "toPhone": "+14155552671",
    "bodyText": "Hello from the Open API"
  }'`;

  const curlGroup = `curl -X POST "${baseUrl}/v1/open/contact-groups" \\
  -H "X-Client-Id: fw_cid_..." \\
  -H "X-Client-Secret: fw_csec_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "VIP customers",
    "phones": ["+14155552671", "8801712345678"]
  }'`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Open API docs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Integrate single and bulk WhatsApp messaging into your own
            application. Single send uses your default device; phones need a
            country code.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/integrations"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Blocks className="size-4" />
            Integrations & Plugins
          </Link>
          <Link
            href="/api-credentials"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <KeyRound className="size-4" />
            Manage credentials
          </Link>
        </div>
      </div>

      <Card className="rounded-lg border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="size-5" />
            Base URL & authentication
          </CardTitle>
          <CardDescription>
            Every Open API call requires client credentials on the request —
            there is no separate token exchange.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyBlock label="Base URL" value={baseUrl} />
          <div className="space-y-2">
            <p className="text-sm font-medium">Required headers</p>
            <ul className="space-y-2">
              {OPEN_API_AUTH_HEADERS.map((h) => (
                <li
                  key={h.name}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <code className="font-mono text-xs font-semibold">
                    {h.name}
                  </code>
                  <span className="mt-0.5 block text-muted-foreground">
                    {h.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Recommended flow</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {OPEN_API_FLOW_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Standard response format</p>
            <p className="text-sm text-muted-foreground">
              Every Open API response uses this envelope. Endpoint payloads live
              in <code className="font-mono text-xs">data</code>.
            </p>
            <CopyBlock
              label="Success envelope"
              value={OPEN_API_RESPONSE_FORMAT}
              multiline
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-lg">Quick start (cURL)</CardTitle>
          <CardDescription>
            Replace credentials with values from your workspace. Single messages
            send from the default connected device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyBlock label="Send single message" value={curlSingle} multiline />
          <CopyBlock
            label="Create contact group with phones"
            value={curlGroup}
            multiline
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Endpoints
        </h2>
        {OPEN_API_ENDPOINTS.map((endpoint) => (
          <EndpointCard
            key={endpoint.id}
            endpoint={endpoint}
            baseUrl={baseUrl}
          />
        ))}
      </div>

      <Card className="rounded-lg border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-lg">Errors</CardTitle>
          <CardDescription>
            Failed requests return a consistent JSON error body.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyBlock
            label="Error envelope"
            value={OPEN_API_ERROR_FORMAT}
            multiline
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Common error codes</p>
            <ul className="space-y-2">
              {OPEN_API_COMMON_ERRORS.map((err) => (
                <li
                  key={err.code}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <code className="font-mono text-xs font-semibold">
                    {err.code}
                  </code>
                  <span className="mt-0.5 block text-muted-foreground">
                    {err.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EndpointCard({
  endpoint,
  baseUrl,
}: {
  endpoint: OpenApiEndpointDoc;
  baseUrl: string;
}) {
  const fullPath = `${baseUrl}${endpoint.path}`;

  return (
    <Card className="rounded-lg border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("font-mono", methodBadgeClass(endpoint.method))}>
            {endpoint.method}
          </Badge>
          <code className="break-all font-mono text-sm">{endpoint.path}</code>
        </div>
        <div>
          <CardTitle className="text-base">{endpoint.title}</CardTitle>
          <CardDescription className="mt-1">
            {endpoint.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CopyBlock label="Full URL" value={fullPath} />
        {endpoint.bodyExample ? (
          <CopyBlock
            label="Request body"
            value={endpoint.bodyExample}
            multiline
          />
        ) : null}
        {endpoint.responseExample ? (
          <CopyBlock
            label="Example response"
            value={endpoint.responseExample}
            multiline
          />
        ) : null}
        {endpoint.notes?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {endpoint.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CopyBlock({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await copyText(value, label);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copy
        </Button>
      </div>
      <pre
        className={cn(
          "overflow-x-auto rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100",
          multiline ? "whitespace-pre-wrap" : "whitespace-pre"
        )}
      >
        {value}
      </pre>
    </div>
  );
}
