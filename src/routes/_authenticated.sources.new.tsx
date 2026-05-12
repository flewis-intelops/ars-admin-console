import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CornerBrackets,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
} from "@/components/ars/primitives";

export const Route = createFileRoute("/_authenticated/sources/new")({
  component: RegisterSourcePage,
});

const SOURCE_TYPES = ["walk_in", "casual", "ci", "sub_source", "cooperating_defendant", "sensitive", "liaison"] as const;
const AORS = ["Reynosa Sector", "Nuevo Laredo", "Monterrey Metro"];

function RegisterSourcePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    true_name: "",
    dob: "",
    id_document_type: "PASSPORT",
    id_document_number: "",
    source_type: "recruited" as (typeof SOURCE_TYPES)[number],
    aor: "AOR-NORTH",
    vetting_notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    pseudonym: string;
    code: string;
    expires_at: string;
  } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("register_source", {
      p_true_name: form.true_name,
      p_dob: (form.dob || null) as unknown as string,
      p_id_document_type: form.id_document_type,
      p_id_document_number: form.id_document_number,
      p_source_type: form.source_type,
      p_aor: form.aor,
      p_vetting_notes: form.vetting_notes,
    });
    setSubmitting(false);
    if (error) {
      if (error.message.includes("PseudonymSpaceExhausted"))
        setErr("Pseudonym space exhausted — contact admin.");
      else if (error.message.includes("NotAHandler"))
        setErr("Account is not a registered handler.");
      else setErr(error.message);
      return;
    }
    const row = (data as Array<{ source_id: string; pseudonym: string; code: string; expires_at: string }>)?.[0];
    if (row) setResult({ pseudonym: row.pseudonym, code: row.code, expires_at: row.expires_at });
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>REGISTER SOURCE</SectionLabel>
        <Link to="/sources">
          <SecondaryButton type="button">Cancel</SecondaryButton>
        </Link>
      </div>

      <Panel>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="TRUE NAME (FIREWALLED)">
            <Input
              required
              value={form.true_name}
              onChange={(v) => set("true_name", v)}
              placeholder="Full legal name"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="DATE OF BIRTH">
              <Input type="date" value={form.dob} onChange={(v) => set("dob", v)} />
            </Field>
            <Field label="ID DOCUMENT TYPE">
              <Select
                value={form.id_document_type}
                onChange={(v) => set("id_document_type", v)}
                options={["PASSPORT", "NATIONAL_ID", "MILITARY_ID", "OTHER"]}
              />
            </Field>
          </div>

          <Field label="ID DOCUMENT NUMBER">
            <Input
              value={form.id_document_number}
              onChange={(v) => set("id_document_number", v)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="SOURCE TYPE">
              <Select
                value={form.source_type}
                onChange={(v) => set("source_type", v as never)}
                options={[...SOURCE_TYPES]}
              />
            </Field>
            <Field label="AOR">
              <Select value={form.aor} onChange={(v) => set("aor", v)} options={AORS} />
            </Field>
          </div>

          <Field label="VETTING NOTES">
            <textarea
              value={form.vetting_notes}
              onChange={(e) => set("vetting_notes", e.target.value)}
              rows={4}
              className="w-full bg-transparent px-3 py-2 font-mono text-[12px] text-white outline-none focus:border-[color:var(--amber)]"
              style={{ border: "1px solid var(--hairline-strong)" }}
            />
          </Field>

          {err && (
            <div className="font-mono text-[10px]" style={{ color: "var(--red-light)" }}>
              {err}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Registering…" : "Register & Issue Code"}
            </PrimaryButton>
          </div>
        </form>
      </Panel>

      {result && (
        <SuccessModal
          {...result}
          onClose={() => {
            setResult(null);
            navigate({ to: "/sources" });
          }}
        />
      )}
    </div>
  );
}

function SuccessModal({
  pseudonym,
  code,
  expires_at,
  onClose,
}: {
  pseudonym: string;
  code: string;
  expires_at: string;
  onClose: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remainMs = Math.max(0, new Date(expires_at).getTime() - now);
  const mm = Math.floor(remainMs / 60000)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor((remainMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <CornerBrackets className="w-full max-w-md">
        <div
          className="p-6"
          style={{ backgroundColor: "var(--panel)", border: "1px solid var(--hairline-strong)" }}
        >
          <SectionLabel>SOURCE REGISTERED</SectionLabel>
          <div className="text-center my-6 space-y-4">
            <div>
              <div
                className="font-mono text-[9px] tracking-[0.22em]"
                style={{ color: "var(--amber-dim)" }}
              >
                PSEUDONYM
              </div>
              <div
                className="font-mono text-4xl mt-1"
                style={{ color: "var(--amber)" }}
              >
                {pseudonym}
              </div>
            </div>
            <div>
              <div
                className="font-mono text-[9px] tracking-[0.22em]"
                style={{ color: "var(--amber-dim)" }}
              >
                PAIRING CODE
              </div>
              <div className="font-mono text-5xl tracking-[0.2em] mt-1 text-white">{code}</div>
            </div>
            <div
              className="font-mono text-[10px] tracking-[0.18em]"
              style={{ color: remainMs > 0 ? "var(--orange)" : "var(--red-light)" }}
            >
              {remainMs > 0 ? `EXPIRES IN ${mm}:${ss}` : "EXPIRED"}
            </div>
          </div>
          <div
            className="font-mono text-[10px] p-3 mb-4"
            style={{ border: "1px solid rgba(220,38,38,0.4)", color: "var(--red-light)" }}
          >
            Hand this code to the source in person. Do not transmit electronically.
          </div>
          <div className="flex justify-end">
            <PrimaryButton onClick={onClose}>Done</PrimaryButton>
          </div>
        </div>
      </CornerBrackets>
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

function Input({
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent px-3 py-2 font-mono text-[12px] text-white outline-none focus:border-[color:var(--amber)]"
      style={{ border: "1px solid var(--hairline-strong)" }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[color:var(--bg)] px-3 py-2 font-mono text-[12px] text-white outline-none"
      style={{ border: "1px solid var(--hairline-strong)" }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace("_", " ").toUpperCase()}
        </option>
      ))}
    </select>
  );
}
