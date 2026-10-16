"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setConfigured(Boolean(data?.configured)))
      .catch(() => setConfigured(null));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (inFlight.current) return;
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "Sign-in failed. Please try again.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6" noValidate>
      {configured === false && (
        <Alert tone="warning" className="mb-4" title="Administrator access is not configured">
          Set <code className="font-mono">ADMIN_EMAIL</code>, <code className="font-mono">ADMIN_PASSWORD</code> and{" "}
          <code className="font-mono">ADMIN_SESSION_SECRET</code> in the environment, then restart the server.
        </Alert>
      )}
      {error && (
        <Alert tone="danger" className="mb-4" title="Sign-in failed">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <Input
          label="Email address"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="admin@company.com"
        />
        <Input
          label="Password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          error={null}
        />
      </div>

      <Button
        type="submit"
        block
        className="mt-5"
        loading={submitting}
        loadingLabel="Signing in…"
        icon={<LogIn size={16} />}
      >
        Sign in
      </Button>

      <p className="mt-4 text-xs leading-5 text-muted">
        Sessions last 8 hours and are signed with a server-side secret. Repeated failed attempts are rate limited.
      </p>
    </form>
  );
}
