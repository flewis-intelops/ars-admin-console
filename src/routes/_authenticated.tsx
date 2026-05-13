import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClassificationBanner } from "@/components/ars/primitives";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ShieldCheck,
  Map,
  FileSearch,
  Bell,
  Search,
  LogOut,
  RefreshCw,
  Download,
} from "lucide-react";
import { toast, Toaster } from "sonner";

type Handler = {
  id: string;
  callsign: string;
  full_name: string;
  unit: string;
  classification_clearance: string;
  aor: string;
};

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const navigate = useNavigate();
  const [handler, setHandler] = useState<Handler | null>(null);
  const [sourcesCount, setSourcesCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: h }, { count }] = await Promise.all([
        supabase.from("handlers").select("*").eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("sources_operational").select("*", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setHandler((h ?? null) as Handler | null);
      setSourcesCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        toast("Session expired. Any unsaved source registration was discarded.");
        navigate({ to: "/login" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      <ClassificationBanner position="top" />
      <div className="flex-1 flex">
        <Sidebar handler={handler} sourcesCount={sourcesCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader handler={handler} />
          <Toolbar />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <ClassificationBanner position="bottom" />
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}

const NAV = [
  {
    group: "OPERATIONS",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/sources", label: "Sources", icon: Users },
      { to: "/sources", label: "Active Taskings", icon: ClipboardList, disabled: true },
    ],
  },
  {
    group: "INTELLIGENCE",
    items: [
      { to: "/sources", label: "Validation Queue", icon: FileSearch, disabled: true },
      { to: "/sources", label: "AOR Map", icon: Map, disabled: true },
    ],
  },
  {
    group: "OVERSIGHT",
    items: [{ to: "/sources", label: "Audit Log", icon: ShieldCheck, disabled: true }],
  },
];

function Sidebar({ handler, sourcesCount }: { handler: Handler | null; sourcesCount: number }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="shrink-0 flex flex-col"
      style={{
        width: 232,
        backgroundColor: "var(--panel)",
        borderRight: "1px solid var(--hairline)",
      }}
    >
      <div className="p-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div
          className="font-display text-2xl font-semibold tracking-[0.4em]"
          style={{ color: "var(--amber)" }}
        >
          ARS
        </div>
        <div
          className="font-mono text-[9px] tracking-[0.22em] mt-1"
          style={{ color: "var(--amber-dim)" }}
        >
          HANDLER CONSOLE
        </div>
      </div>

      {/* Operator card — live */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div
          className="font-mono text-[9px] tracking-[0.18em] mb-2"
          style={{ color: "var(--amber-dim)" }}
        >
          OPERATOR
        </div>
        <div className="font-display text-lg font-semibold" style={{ color: "var(--amber)" }}>
          {handler?.callsign ?? "—"}
        </div>
        <div className="font-mono text-[10px] mt-1 text-white/70">
          {handler?.full_name ?? "—"}
        </div>
        <div
          className="font-mono text-[9px] tracking-[0.14em] mt-2"
          style={{ color: "var(--amber-dim)" }}
        >
          {handler?.unit ?? "—"}
        </div>
        {/* Clearance and AOR intentionally not shown — clearance is not modeled, AOR is per-source. */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl text-white">{sourcesCount}</span>
          <span
            className="font-mono text-[9px] tracking-[0.18em]"
            style={{ color: "var(--amber-dim)" }}
          >
            ACTIVE SOURCES
          </span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-auto">
        {NAV.map((g) => (
          <div key={g.group}>
            <div
              className="font-mono text-[9px] tracking-[0.22em] px-2 mb-1"
              style={{ color: "var(--amber-dim)" }}
            >
              {g.group}
            </div>
            {g.items.map((item, idx) => {
              const Icon = item.icon;
              const active =
                "exact" in item && item.exact ? path === item.to : path.startsWith(item.to);
              const disabled = "disabled" in item && item.disabled;
              const cls =
                "flex items-center gap-2 px-2 py-2 font-mono text-[11px] tracking-[0.12em] uppercase";
              if (disabled) {
                return (
                  <div
                    key={idx}
                    className={cls + " cursor-not-allowed"}
                    style={{ color: "var(--amber-dim)", opacity: 0.5 }}
                    title="Not in v0.1"
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {item.label}
                  </div>
                );
              }
              return (
                <Link
                  key={idx}
                  to={item.to}
                  className={cls + " hover:bg-white/5"}
                  style={{
                    color: active ? "var(--amber)" : "rgba(229,231,235,0.75)",
                    borderLeft: active ? "2px solid var(--amber)" : "2px solid transparent",
                  }}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className="p-3 font-mono text-[9px] tracking-[0.18em]"
        style={{ borderTop: "1px solid var(--hairline)", color: "var(--amber-dim)" }}
      >
        ARS v0.1 · POC BUILD
      </div>
    </aside>
  );
}

function TopHeader({ handler }: { handler: Handler | null }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const crumb =
    path === "/"
      ? "DASHBOARD"
      : path.startsWith("/sources/new")
        ? "SOURCES / REGISTER"
        : path.startsWith("/sources")
          ? "SOURCES"
          : path.toUpperCase();
  return (
    <header
      className="flex items-center gap-4 px-6 py-3"
      style={{ backgroundColor: "var(--panel)", borderBottom: "1px solid var(--hairline)" }}
    >
      <div
        className="font-mono text-[10px] tracking-[0.22em]"
        style={{ color: "var(--amber-dim)" }}
      >
        {handler?.unit?.split(" / ")[0] ?? "TF-7"} <span style={{ color: "var(--amber)" }}>›</span> {crumb}
      </div>
      <div className="flex-1 max-w-md ml-6">
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{ border: "1px solid var(--hairline)", backgroundColor: "var(--bg)", opacity: 0.5, cursor: "not-allowed" }}
          title="Coming in v0.3"
        >
          <Search size={12} strokeWidth={1.5} style={{ color: "var(--amber-dim)" }} />
          <input
            disabled
            title="Coming in v0.3"
            placeholder="SEARCH PSEUDONYM, AOR, PIR…"
            className="bg-transparent outline-none font-mono text-[11px] tracking-[0.1em] flex-1 text-white/80 placeholder:text-white/30 cursor-not-allowed"
          />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          disabled
          className="relative p-2 cursor-not-allowed"
          title="Coming in v0.3"
          style={{ border: "1px solid var(--hairline)", opacity: 0.5 }}
        >
          <Bell size={14} strokeWidth={1.5} style={{ color: "var(--amber)" }} />
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--orange)" }}
          />
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="flex items-center gap-2 px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{ border: "1px solid var(--hairline)", color: "var(--amber)" }}
          title={handler?.callsign ?? ""}
        >
          <LogOut size={12} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </header>
  );
}

function Toolbar() {
  const [tw, setTw] = useState("24H");
  return (
    <div
      className="flex items-center gap-3 px-6 py-2"
      style={{ backgroundColor: "var(--bg)", borderBottom: "1px solid var(--hairline)" }}
    >
      <div style={{ opacity: 0.5, pointerEvents: "none", cursor: "not-allowed" }} title="Coming in v0.3">
        <ToolbarGroup label="TIME">
          {["6H", "24H", "7D", "30D"].map((w) => (
            <ToolbarChip key={w} active={tw === w} onClick={() => setTw(w)}>
              {w}
            </ToolbarChip>
          ))}
        </ToolbarGroup>
      </div>
      <div style={{ opacity: 0.5, pointerEvents: "none", cursor: "not-allowed" }} title="Coming in v0.3">
        <ToolbarGroup label="AOR">
          {["ALL", "REYNOSA", "N. LAREDO", "MONTERREY"].map((w) => (
            <ToolbarChip key={w}>{w}</ToolbarChip>
          ))}
        </ToolbarGroup>
      </div>
      <div style={{ opacity: 0.5, pointerEvents: "none", cursor: "not-allowed" }} title="Coming in v0.3">
        <ToolbarGroup label="PIR">
          {["ALL", "PIR-1", "PIR-2", "PIR-3"].map((w) => (
            <ToolbarChip key={w}>{w}</ToolbarChip>
          ))}
        </ToolbarGroup>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          disabled
          className="p-2 cursor-not-allowed"
          style={{ border: "1px solid var(--hairline)", color: "var(--amber)", opacity: 0.5 }}
          title="Coming in v0.3"
        >
          <RefreshCw size={12} strokeWidth={1.5} />
        </button>
        <button
          disabled
          className="p-2 cursor-not-allowed"
          style={{ border: "1px solid var(--hairline)", color: "var(--amber)", opacity: 0.5 }}
          title="Coming in v0.3"
        >
          <Download size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="font-mono text-[9px] tracking-[0.22em] mr-1"
        style={{ color: "var(--amber-dim)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function ToolbarChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 font-mono text-[10px] tracking-[0.14em]"
      style={{
        border: "1px solid var(--hairline)",
        color: active ? "#0A0B0D" : "var(--amber)",
        backgroundColor: active ? "var(--amber)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}
