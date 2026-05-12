import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton, SecondaryButton, SectionLabel } from "./primitives";
import { toast } from "sonner";

const PRIORITIES = [
  { value: "time_sensitive", label: "Time-Sensitive" },
  { value: "priority", label: "Priority" },
  { value: "routine", label: "Routine" },
];

const PIRS = ["PIR-1", "PIR-2", "PIR-3", "PIR-4", "PIR-5", "PIR-6", "PIR-7", "PIR-8"];

type SourceOpt = { id: string; pseudonym: string };

export function ComposeTaskingModal({
  open,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onIssued: () => void;
}) {
  const [sources, setSources] = useState<SourceOpt[]>([]);
  const [pseudonym, setPseudonym] = useState("");
  const [priority, setPriority] = useState("priority");
  const [pir, setPir] = useState("PIR-1");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("sources_operational")
      .select("id,pseudonym")
      .order("pseudonym")
      .then(({ data }) => {
        const list = (data ?? []) as SourceOpt[];
        setSources(list);
        const preferred = list.find((s) => s.pseudonym === "S-7421");
        setPseudonym(preferred?.pseudonym ?? list[0]?.pseudonym ?? "");
      });
  }, [open]);

  const reset = () => {
    setTitle("");
    setBody("");
    setDueAt("");
    setPriority("priority");
    setPir("PIR-1");
  };

  const submit = async () => {
    if (!pseudonym || !title.trim()) {
      toast.error("Source and title are required");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("issue_tasking", {
      p_source_pseudonym: pseudonym,
      p_priority: priority,
      p_pir: pir,
      p_title: title.trim(),
      p_body: (body.trim() || null) as unknown as string,
      p_due_at: (dueAt ? new Date(dueAt).toISOString() : null) as unknown as string,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const display = data?.[0]?.task_id_display;
    toast.success(`Tasking ${display} issued to ${pseudonym}`);
    reset();
    onOpenChange(false);
    onIssued();
  };

  const inputStyle = {
    backgroundColor: "var(--panel)",
    border: "1px solid var(--hairline-strong)",
    color: "var(--amber)",
  } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl rounded-none p-0"
        style={{ backgroundColor: "var(--panel)", border: "1px solid var(--hairline-strong)" }}
      >
        <div className="p-5">
          <DialogHeader>
            <DialogTitle asChild>
              <div>
                <SectionLabel>COMPOSE TASKING</SectionLabel>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 font-mono text-[11px]">
            <Field label="SOURCE">
              <select
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
                className="w-full px-2 py-2 outline-none"
                style={inputStyle}
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.pseudonym} style={{ backgroundColor: "#0A0B0D" }}>
                    {s.pseudonym}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="PRIORITY">
              <div className="flex gap-4">
                {PRIORITIES.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 cursor-pointer text-white/80">
                    <input
                      type="radio"
                      name="priority"
                      value={p.value}
                      checked={priority === p.value}
                      onChange={(e) => setPriority(e.target.value)}
                      className="accent-amber-500"
                    />
                    <span className="uppercase tracking-[0.1em]">{p.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="PIR">
              <select
                value={pir}
                onChange={(e) => setPir(e.target.value)}
                className="w-full px-2 py-2 outline-none"
                style={inputStyle}
              >
                {PIRS.map((p) => (
                  <option key={p} value={p} style={{ backgroundColor: "#0A0B0D" }}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="TITLE">
              <input
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2 py-2 outline-none"
                style={inputStyle}
              />
            </Field>

            <Field label="BODY (OPTIONAL)">
              <textarea
                value={body}
                maxLength={600}
                rows={4}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-2 py-2 outline-none resize-none"
                style={inputStyle}
              />
            </Field>

            <Field label="DUE (OPTIONAL)">
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-2 py-2 outline-none"
                style={inputStyle}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-5">
            <SecondaryButton onClick={() => onOpenChange(false)} disabled={submitting}>
              CANCEL
            </SecondaryButton>
            <PrimaryButton onClick={submit} disabled={submitting}>
              {submitting ? "ISSUING…" : "ISSUE TASKING"}
            </PrimaryButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="font-mono text-[9px] tracking-[0.22em] mb-1"
        style={{ color: "var(--amber-dim)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
