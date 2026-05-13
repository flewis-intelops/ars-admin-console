import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { statusTone } from "@/lib/utils";
import { Panel, Pill, SecondaryButton } from "@/components/ars/primitives";
import { ComposeTaskingModal } from "@/components/ars/compose-tasking-modal";
import { ValidationDrawer, type ReportFull } from "@/components/ars/validation-drawer";

type Source = {
  id: string;
  pseudonym: string;
  source_type: string;
  reliability: string | null;
  aor: string;
  status: string;
  last_contact_at: string | null;
};

type TaskingRow = {
  id: string;
  task_id_display: string;
  title: string;
  priority: string;
  pir: string | null;
  due_at: string | null;
  sources_operational: { pseudonym: string } | null;
};

type ReportRow = {
  id: string;
  report_id_display: string;
  category: string;
  confidence: string;
  submitted_at: string;
  sources_operational: { pseudonym: string } | null;
};

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const [sources, setSources] = useState<Source[]>([]);
  const [taskings, setTaskings] = useState<TaskingRow[]>([]);
  const [pendingReports, setPendingReports] = useState<ReportRow[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportFull | null>(null);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  const loadSources = useCallback(() => {
    supabase
      .from("sources_operational")
      .select("id,pseudonym,source_type,reliability,aor,status,last_contact_at")
      .order("last_contact_at", { ascending: false })
      .then(({ data }) => setSources((data ?? []) as Source[]));
  }, []);

  const loadTaskings = useCallback(() => {
    supabase
      .from("taskings")
      .select("id, task_id_display, title, priority, pir, due_at, sources_operational(pseudonym)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setTaskings((data ?? []) as unknown as TaskingRow[]));
  }, []);

  const loadReports = useCallback(() => {
    supabase
      .from("reports")
      .select(
        "id, report_id_display, category, confidence, submitted_at, sources_operational(pseudonym)",
      )
      .eq("validation_status", "pending_validation")
      .order("submitted_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setPendingReports((data ?? []) as unknown as ReportRow[]);
        setReportsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!activeReport || !reportsLoaded) return;
    const stillPending = pendingReports.some((r) => r.id === activeReport.id);
    if (!stillPending) {
      toast.info(
        `Report ${activeReport.report_id_display} no longer pending — it was validated, rejected, or put on hold elsewhere.`,
      );
      setActiveReport(null);
    }
  }, [pendingReports, activeReport, reportsLoaded]);

  useEffect(() => {
    loadSources();
    loadTaskings();
    loadReports();
    const i = setInterval(() => {
      loadSources();
      loadTaskings();
      loadReports();
    }, 5000);
    return () => clearInterval(i);
  }, [loadSources, loadTaskings, loadReports]);

  const openReport = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, report_id_display, submitted_at, category, sub_category, person_sex, person_age, person_build, person_features, mgrs, named_place, when_observed, activity, basis_of_knowledge, confidence, has_photo, has_voice, sources_operational(pseudonym)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) {
        toast.error(`Couldn't open report: ${error.message}`);
        return;
      }
      if (!data) {
        toast.info(
          "That report is no longer pending — it was just validated, rejected, or put on hold. Refreshing queue.",
        );
        loadReports();
        return;
      }
      const d = data as unknown as Omit<ReportFull, "pseudonym"> & {
        sources_operational: { pseudonym: string } | null;
      };
      setActiveReport({ ...d, pseudonym: d.sources_operational?.pseudonym ?? "—" });
    } catch (e) {
      toast.error(
        `Couldn't open report: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-4">
        <Kpi label="PENDING VALIDATION" value={String(pendingReports.length)} live />
        <Kpi label="PIR COVERAGE" value="62%" delta="+4%" />
        <Kpi label="ACTIVE SOURCES" value={String(sources.length)} live />
        <Kpi label="TIME-TO-REPORT" value="38m" delta="-6m" />
        <Kpi label="CORROBORATION · 7D" value="71%" delta="+2%" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Source Health — LIVE */}
          <Panel title="SOURCE HEALTH">
            <div className="overflow-hidden">
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr style={{ color: "var(--amber-dim)" }}>
                    {["PSEUDONYM", "TYPE", "REL", "AOR", "STATUS", "LAST CONTACT"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-2 py-2 tracking-[0.16em] text-[10px] font-normal"
                        style={{ borderBottom: "1px solid var(--hairline)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="px-2 py-2" style={{ color: "var(--amber)" }}>
                        {s.pseudonym}
                      </td>
                      <td className="px-2 py-2 text-white/70 uppercase">
                        {s.source_type.replace("_", " ")}
                      </td>
                      <td className="px-2 py-2">
                        <ReliabilityBadge grade={s.reliability} />
                      </td>
                      <td className="px-2 py-2 text-white/70">{s.aor}</td>
                      <td className="px-2 py-2">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="px-2 py-2 text-white/60">{relTime(s.last_contact_at)}</td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-white/40">
                        No sources.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="PIR HEATMAP" placeholder>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8"
                  style={{
                    backgroundColor: `rgba(201,169,97,${0.05 + (i % 7) * 0.08})`,
                    border: "1px solid var(--hairline)",
                  }}
                />
              ))}
            </div>
          </Panel>

          <Panel title="AOR MAP" placeholder>
            <div
              className="h-48 flex items-center justify-center font-mono text-[10px]"
              style={{ color: "var(--amber-dim)", border: "1px dashed var(--hairline)" }}
            >
              MAP TILE — NOT WIRED
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="FORCE PROTECTION" placeholder>
            <ul className="space-y-2 font-mono text-[11px]">
              <li className="flex justify-between">
                <span className="text-white/80">CHECKPOINT-3 BREACH</span>
                <Pill tone="red">CRIT</Pill>
              </li>
              <li className="flex justify-between">
                <span className="text-white/80">SIGINT SPIKE · AOR-N</span>
                <Pill tone="orange">PRIORITY</Pill>
              </li>
            </ul>
          </Panel>

          <Panel title="VALIDATION QUEUE">
            <div className="font-mono text-[11px] space-y-2">
              {pendingReports.length === 0 && (
                <div className="text-white/40 text-center py-2">No reports pending.</div>
              )}
              {pendingReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openReport(r.id)}
                  className="w-full flex justify-between gap-3 hover:bg-white/[0.03] px-1 py-1 text-left"
                >
                  <span style={{ color: "var(--amber)" }}>
                    {r.sources_operational?.pseudonym ?? "—"}
                  </span>
                  <span className="text-white/60 text-right">
                    {r.report_id_display} · {r.category.toUpperCase()} · {r.confidence.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="ACTIVE TASKINGS">
            <div className="space-y-3">
              <div className="flex justify-end">
                <SecondaryButton onClick={() => setComposeOpen(true)} className="!py-1 !px-3">
                  + ISSUE TASKING
                </SecondaryButton>
              </div>
              <div className="font-mono text-[11px] space-y-2">
                {taskings.length === 0 && (
                  <div className="text-white/40 text-center py-2">No active taskings.</div>
                )}
                {taskings.map((t) => (
                  <div key={t.id} className="flex justify-between gap-3">
                    <span style={{ color: "var(--amber)" }}>
                      {t.sources_operational?.pseudonym ?? "—"}
                    </span>
                    <span className="text-white/60 text-right">
                      {t.task_id_display} ·{" "}
                      {t.title.length > 40 ? t.title.slice(0, 40) + "…" : t.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="TASKING RECOMMENDATIONS" placeholder>
            <div className="font-mono text-[11px] space-y-2">
              <Row pseud="S-1156" note="Best-fit for PIR-2 cell mapping" />
              <Row pseud="S-4407" note="Re-engage · 96h dormant" />
            </div>
          </Panel>

          <Panel title="RECENT ACTIVITY" placeholder>
            <ul className="font-mono text-[10px] space-y-1 text-white/70">
              <li>14:22 · WALKER-3 logged in</li>
              <li>13:01 · Report #4470 filed</li>
              <li>11:47 · S-7421 contacted</li>
            </ul>
          </Panel>
        </div>
      </div>

      <ComposeTaskingModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onIssued={loadTaskings}
      />
      <ValidationDrawer
        report={activeReport}
        onOpenChange={(v) => {
          if (!v) setActiveReport(null);
        }}
        onDecision={loadReports}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  tone = "amber",
  live = false,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "amber" | "orange" | "red";
  live?: boolean;
}) {
  const color = tone === "red" ? "var(--red-light)" : tone === "orange" ? "var(--orange)" : "var(--amber)";
  return (
    <Panel placeholder={!live}>
      <div
        className="font-mono text-[9px] tracking-[0.22em]"
        style={{ color: "var(--amber-dim)" }}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-mono text-3xl" style={{ color }}>
          {value}
        </div>
        {delta && (
          <div className="font-mono text-[10px] text-white/50">{delta}</div>
        )}
      </div>
    </Panel>
  );
}

function ReliabilityBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-white/30">—</span>;
  const tone =
    grade === "A" ? "green" : grade === "B" ? "amber" : grade === "F" ? "red" : "muted";
  return <Pill tone={tone as never}>{grade}</Pill>;
}

function StatusPill({ status }: { status: string }) {
  return <Pill tone={statusTone(status)}>{status.replace("_", " ")}</Pill>;
}

function Row({ pseud, note }: { pseud: string; note: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: "var(--amber)" }}>{pseud}</span>
      <span className="text-white/60 text-right">{note}</span>
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
