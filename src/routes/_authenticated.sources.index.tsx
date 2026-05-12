import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Pill, PrimaryButton, SectionLabel } from "@/components/ars/primitives";
import { X } from "lucide-react";

type Source = {
  id: string;
  pseudonym: string;
  source_type: string;
  reliability: string | null;
  aor: string;
  status: string;
  last_contact_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/sources/")({
  component: SourcesPage,
});

function SourcesPage() {
  const [rows, setRows] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Source | null>(null);

  useEffect(() => {
    supabase
      .from("sources_operational")
      .select("*")
      .order("last_contact_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Source[]));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>SOURCES — HANDLER SCOPED</SectionLabel>
        <Link to="/sources/new">
          <PrimaryButton>+ Register Source</PrimaryButton>
        </Link>
      </div>

      <Panel>
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr style={{ color: "var(--amber-dim)" }}>
              {["PSEUDONYM", "TYPE", "RELIABILITY", "AOR", "STATUS", "LAST CONTACT"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 tracking-[0.16em] text-[10px] font-normal"
                  style={{ borderBottom: "1px solid var(--hairline)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSelected(s)}
                className="cursor-pointer hover:bg-white/[0.03]"
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                <td className="px-3 py-3" style={{ color: "var(--amber)" }}>
                  {s.pseudonym}
                </td>
                <td className="px-3 py-3 text-white/70 uppercase">
                  {s.source_type.replace("_", " ")}
                </td>
                <td className="px-3 py-3">
                  {s.reliability ? <Pill tone="amber">{s.reliability}</Pill> : <span className="text-white/30">—</span>}
                </td>
                <td className="px-3 py-3 text-white/70">{s.aor}</td>
                <td className="px-3 py-3">
                  <Pill
                    tone={
                      s.status === "active"
                        ? "green"
                        : s.status === "pending_vetting"
                          ? "orange"
                          : s.status === "dormant"
                            ? "muted"
                            : "red"
                    }
                  >
                    {s.status.replace("_", " ")}
                  </Pill>
                </td>
                <td className="px-3 py-3 text-white/60">{relTime(s.last_contact_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-white/40">
                  No sources registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      {selected && <Drawer source={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Drawer({ source, onClose }: { source: Source; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] h-full p-6 overflow-auto"
        style={{ backgroundColor: "var(--panel)", borderLeft: "1px solid var(--hairline-strong)" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <SectionLabel>SOURCE DETAIL</SectionLabel>
            <div
              className="font-mono text-3xl"
              style={{ color: "var(--amber)" }}
            >
              {source.pseudonym}
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--amber)" }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <dl className="space-y-3 font-mono text-[11px]">
          <Row k="TYPE" v={source.source_type.replace("_", " ").toUpperCase()} />
          <Row k="RELIABILITY" v={source.reliability ?? "—"} />
          <Row k="AOR" v={source.aor} />
          <Row k="STATUS" v={source.status.replace("_", " ").toUpperCase()} />
          <Row k="LAST CONTACT" v={relTime(source.last_contact_at)} />
          <Row k="REGISTERED" v={new Date(source.created_at).toISOString().slice(0, 10)} />
        </dl>

        <div
          className="mt-6 p-3 font-mono text-[10px]"
          style={{ border: "1px solid var(--hairline)", color: "var(--amber-dim)" }}
        >
          TRUE IDENTITY FIREWALLED · use Resolve True Identity workflow (not in v0.1)
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between" style={{ borderBottom: "1px solid var(--hairline)" }}>
      <dt style={{ color: "var(--amber-dim)" }} className="py-2 tracking-[0.16em] text-[10px]">
        {k}
      </dt>
      <dd className="py-2 text-white/85">{v}</dd>
    </div>
  );
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
