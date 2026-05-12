import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClassificationBanner,
  CornerBrackets,
  PrimaryButton,
} from "@/components/ars/primitives";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("walker3@ars.demo");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      <ClassificationBanner position="top" />
      <main className="flex-1 flex items-center justify-center px-4">
        <CornerBrackets className="w-full max-w-sm">
          <div
            className="p-8"
            style={{ backgroundColor: "var(--panel)", border: "1px solid var(--hairline)" }}
          >
            <div className="text-center mb-8">
              <div
                className="font-display text-3xl font-semibold tracking-[0.4em]"
                style={{ color: "var(--amber)" }}
              >
                ARS
              </div>
              <div
                className="font-mono text-[9px] tracking-[0.22em] mt-1"
                style={{ color: "var(--amber-dim)" }}
              >
                HANDLER CONSOLE · v0.1
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="EMAIL">
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--amber)]"
                  style={{ border: "1px solid var(--hairline-strong)" }}
                />
              </Field>
              <Field label="PASSWORD">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--amber)]"
                  style={{ border: "1px solid var(--hairline-strong)" }}
                />
              </Field>
              {err && (
                <div
                  className="font-mono text-[10px] tracking-wide"
                  style={{ color: "var(--red-light)" }}
                >
                  {err}
                </div>
              )}
              <PrimaryButton type="submit" disabled={loading} className="w-full">
                {loading ? "Authenticating…" : "Sign In"}
              </PrimaryButton>
            </form>

            <div
              className="mt-6 text-center font-mono text-[9px] tracking-[0.18em]"
              style={{ color: "var(--amber-dim)" }}
            >
              POC demo auth · production uses PIV/CAC + unit SSO
            </div>
          </div>
        </CornerBrackets>
      </main>
      <ClassificationBanner position="bottom" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block font-mono text-[10px] tracking-[0.2em] mb-1"
        style={{ color: "var(--amber-dim)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
