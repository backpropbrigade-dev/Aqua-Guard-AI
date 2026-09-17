import { useCallback, useMemo, useState } from "react";
import { ClipboardCheck, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import {
  approveAuthorityReview,
  getAuthorityReviewItems,
  rejectAuthorityReview,
  setAuthorityReviewGroupAssignment,
  type AuthorityReviewItem,
} from "@/lib/authority-review-queue";
import { getFieldWorkers, getWorkerGroups } from "@/lib/worker-store";
import { cn } from "@/lib/utils";

function severityClass(s: AuthorityReviewItem["severity"]) {
  switch (s) {
    case "high":
      return "bg-red-500/15 text-red-800 dark:text-red-200";
    case "medium":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
    default:
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  }
}

export default function AdminAuthorityReview() {
  useAdminDashboardVersion();
  const items = getAuthorityReviewItems();
  const workers = getFieldWorkers();
  const groups = getWorkerGroups();
  const [busy, setBusy] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, string[]>>({});

  const pending = useMemo(() => items.filter((x) => x.status === "pending"), [items]);

  const workerName = useCallback(
    (id: string) => workers.find((w) => w.id === id)?.name ?? id,
    [workers],
  );

  const selectedGroupIds = useCallback(
    (reviewId: string, fallback: string[]) => selection[reviewId] ?? fallback,
    [selection],
  );

  const toggleGroup = (reviewId: string, groupId: string, fallback: string[]) => {
    const cur = selectedGroupIds(reviewId, fallback);
    const next = cur.includes(groupId) ? cur.filter((id) => id !== groupId) : [...cur, groupId];
    setSelection((s) => ({ ...s, [reviewId]: next }));
  };

  const onApprove = (item: AuthorityReviewItem) => {
    setBusy(item.id);
    try {
      const groupIds = selectedGroupIds(item.id, item.assignedWorkerGroupIds);
      setAuthorityReviewGroupAssignment(item.id, groupIds);
      const ok = approveAuthorityReview(item.id);
      if (ok) {
        toast.success("Approved — NGO queue updated; citizen notified (+8 verify points).");
        setSelection((s) => {
          const n = { ...s };
          delete n[item.id];
          return n;
        });
      } else toast.error("Could not approve (already resolved?)");
    } finally {
      setBusy(null);
    }
  };

  const onReject = (item: AuthorityReviewItem) => {
    setBusy(item.id);
    try {
      const ok = rejectAuthorityReview(item.id);
      if (ok) {
        toast.message("Request rejected — citizen notified.");
        setSelection((s) => {
          const n = { ...s };
          delete n[item.id];
          return n;
        });
      } else toast.error("Could not reject.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-slate-500/[0.07] via-card to-primary/[0.05] p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Verify citizen reports</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              New pollution uploads appear here first. After you <strong>approve</strong>, the case is mirrored to the NGO incoming queue. Optionally assign <strong>worker groups</strong> (crews); every member in those groups is eligible for reward points when the NGO marks the linked mission{" "}
              <strong>completed</strong>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Citizens earn <strong>severity-based points immediately</strong> on upload, plus <strong>+8</strong> when you verify.
            </p>
          </div>
        </div>
      </div>

      {pending.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No reports awaiting verification. Submit a report as a citizen to see it here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <Card key={item.id} className="border-border/70 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-heading text-lg">{item.locationLabel}</CardTitle>
                    <CardDescription className="mt-1">
                      Citizen: <span className="font-mono text-xs">{item.citizenLabel}</span> · Report{" "}
                      <span className="font-mono text-xs">{item.reportId.slice(0, 14)}…</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={cn("rounded-full capitalize border-0", severityClass(item.severity))}>
                    {item.severity} · {item.severityPercent}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <img src={item.imageUrl} alt="" className="h-28 w-40 rounded-lg object-cover border border-border/60" />
                  <div className="text-sm text-muted-foreground min-w-[200px] flex-1">
                    <p>
                      Plastic (AI demo):{" "}
                      <span className="font-medium text-foreground">{item.plasticDetected ? "Indicated" : "Not indicated"}</span>
                    </p>
                    {item.notes && (
                      <p className="mt-2">
                        Notes: <span className="text-foreground">{item.notes}</span>
                      </p>
                    )}
                    <p className="mt-2 tabular-nums text-xs">
                      {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    Assign worker groups (optional)
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select one or more crews. All members in the selected groups are routed to the NGO request and can earn +40 pts each on verified mission completion.
                  </p>
                  <div className="flex flex-col gap-2">
                    {groups.map((g) => {
                      const sel = selectedGroupIds(item.id, item.assignedWorkerGroupIds);
                      const on = sel.includes(g.id);
                      const members = g.workerIds.map(workerName).join(" · ");
                      return (
                        <Button
                          key={g.id}
                          type="button"
                          size="sm"
                          variant={on ? "default" : "outline"}
                          className="h-auto min-h-10 rounded-xl text-left py-2 px-3 flex flex-col items-stretch gap-0.5"
                          onClick={() => toggleGroup(item.id, g.id, item.assignedWorkerGroupIds)}
                        >
                          <span className="text-sm font-semibold">{g.name}</span>
                          {g.description && <span className="text-[11px] font-normal opacity-90">{g.description}</span>}
                          <span className="text-[11px] font-normal opacity-80 mt-0.5">Members: {members}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" className="rounded-full gap-2" disabled={busy === item.id} onClick={() => onApprove(item)}>
                    <ClipboardCheck className="h-4 w-4" />
                    Approve &amp; send to NGO
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full text-destructive border-destructive/40" disabled={busy === item.id} onClick={() => onReject(item)}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {items.some((x) => x.status !== "pending") && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Recent decisions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {items
              .filter((x) => x.status !== "pending")
              .slice(0, 12)
              .map((x) => (
                <div key={x.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                  <span className="truncate">{x.locationLabel}</span>
                  <span className="shrink-0 capitalize">{x.status}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
