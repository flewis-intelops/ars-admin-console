import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton, SecondaryButton, SectionLabel, Pill } from "./primitives";
import { toast } from "sonner";

export type ReportFull = {
  id: string;
  report_id_display: string;
  pseudonym: string;
  submitted_at: string;
  category: string;
  sub_category: string | null;
  person_sex: string | null;
  person_age: string | null;
  person_build: string | null;
  person_features: string | null;
  mgrs: string | null;
  named_place: string | null;
  when_observed: string | null;
  activity: string | null;
  basis_of_knowledge: string;
  confidence: string;
  has_photo: boolean | null;
  has_voice: boolean | null;
};

export function ValidationDrawer({
  report,
  onOpenChange,
  onDecision,
}: {
  report: ReportFull | null;
  onOpenChange: (v: boolean) => void;
  onDecision: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (decision: "validated" | "rejected" | "on_hold") => {
    if (!report) return;
    setBusy(decision);
    const { error } = await supabase.rpc("validate_report", {
      p_report_id: report.id,
      p_decision: decision,
      p_notes: (notes.trim() || null) as unknown as string,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Report ${report.report_id_display} ${decision.replace("_", " ")}`);
    setNotes("");
    onOpenChange(false);
    onDecision();
  };

  const fields: Array<[string, string | null | undefined]> = report
    ? [
        ["CATEGORY", report.category?.toUpperCase()],
        ["SUB-CATEGORY", report.sub_category],
        ["SEX", report.person_sex],
        ["AGE", report.person_age],
        ["BUILD", report.person_build],
        ["FEATURES", report.person_features],
        ["MGRS", report.mgrs],
        ["NAMED PLACE", report.named_place],
        ["WHEN", report.when_observed],
        ["ACTIVITY", report.activity],
        ["BASIS", report.basis_of_knowledge?.replace(/_/g, " ").toUpperCase()],
        ["CONFIDENCE", report.confidence?.toUpperCase()],
      ]
    : [];

  return (
    <Sheet open={!!report} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[480px] sm:max-w-[480px] rounded-none p-0 overflow-y-auto"
        style={{ backgroundColor: "var(--panel)", border: "1px solid var(--hairline-strong)" }}
      >
        {report && (
          <div className="p-5">
            <SheetHeader>
              <SheetTitle asChild>
                <div>
                  <SectionLabel>VALIDATE REPORT</SectionLabel>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="font-mono text-[11px] mb-4">
              <div style={{ color: "var(--amber)" }} className="text-base">
                {report.report_id_display}
              </div>
              <div className="text-white/60 mt-1">
                {report.pseudonym} · {relTime(report.submitted_at)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[11px] mb-4">
              {fields
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <div
                      className="text-[9px] tracking-[0.22em]"
                      style={{ color: "var(--amber-dim)" }}
                    >
                      {k}
                    </div>
                    <div className="text-white/85">{v}</div>
                  </div>
                ))}
            </div>

            {(report.has_photo || report.has_voice) && (
              <div className="mb-4 space-y-1">
                {report.has_photo && <Pill tone="amber">Photo attached — POC mock</Pill>}
                {report.has_voice && <Pill tone="amber">Voice attached — POC mock</Pill>}
              </div>
            )}

            <div className="mb-4">
              <div
                className="font-mono text-[9px] tracking-[0.22em] mb-1"
                style={{ color: "var(--amber-dim)" }}
              >
                NOTES (OPTIONAL)
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full px-2 py-2 outline-none resize-none font-mono text-[11px]"
                style={{
                  backgroundColor: "var(--bg, #0A0B0D)",
                  border: "1px solid var(--hairline-strong)",
                  color: "var(--amber)",
                }}
              />
            </div>

            <div className="flex gap-2 justify-end flex-wrap">
              <SecondaryButton
                onClick={() => decide("on_hold")}
                disabled={!!busy}
                style={{ borderColor: "var(--amber)", color: "var(--amber)" }}
              >
                {busy === "on_hold" ? "…" : "ON HOLD"}
              </SecondaryButton>
              <SecondaryButton
                onClick={() => decide("rejected")}
                disabled={!!busy}
                style={{ borderColor: "rgba(220,38,38,0.6)", color: "var(--red-light)" }}
              >
                {busy === "rejected" ? "…" : "REJECT"}
              </SecondaryButton>
              <PrimaryButton onClick={() => decide("validated")} disabled={!!busy}>
                {busy === "validated" ? "…" : "VALIDATE"}
              </PrimaryButton>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
