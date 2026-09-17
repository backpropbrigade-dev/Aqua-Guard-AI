import { useState } from "react";
import { Check, MapPin, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNgoVersion } from "@/hooks/useNgoVersion";
import {
  acceptCitizenRequest,
  declineCitizenRequest,
  getIncomingCitizenRequests,
  requestSeverityGuidance,
  type CitizenIncomingRequest,
} from "@/lib/ngo-citizen-requests";
import { cn } from "@/lib/utils";
import { getFieldWorkers } from "@/lib/worker-store";

const sevClass = {
  low: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30",
  high: "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30",
} as const;

function statusBadge(status: CitizenIncomingRequest["status"]) {
  switch (status) {
    case "pending":
      return <Badge className="rounded-full bg-primary/15 text-primary border-primary/30">Pending</Badge>;
    case "accepted":
      return <Badge className="rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30">Accepted</Badge>;
    default:
      return <Badge variant="secondary" className="rounded-full">Declined</Badge>;
  }
}

export default function NgoCitizenRequests() {
  useNgoVersion();
  const [busy, setBusy] = useState<string | null>(null);
  const rows = getIncomingCitizenRequests();
  const workers = getFieldWorkers();
  const workerLabel = (id: string) => workers.find((w) => w.id === id)?.name ?? id;
  const pending = rows.filter((r) => r.status === "pending");

  const run = async (id: string, action: "accept" | "decline") => {
    setBusy(id);
    try {
      if (action === "accept") {
        const ok = acceptCitizenRequest(id);
        if (ok) toast.success("Request accepted — field mission created");
        else toast.error("Could not accept (already resolved?)");
      } else {
        const ok = declineCitizenRequest(id);
        if (ok) toast.success("Request declined — citizen will see updated status");
        else toast.error("Could not decline");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] to-ocean-mid/[0.08] p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Citizen requests</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              When citizens submit reports, they appear here. Use severity and platform routing to decide. Accepting creates a{" "}
              <strong>field mission</strong> and updates the citizen&apos;s report status.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-center shrink-0">
            <p className="text-2xl font-heading font-bold text-primary tabular-nums">{pending.length}</p>
            <p className="text-xs text-muted-foreground">awaiting action</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No citizen requests yet. Submit a report as a citizen to see it here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((r, i) => (
            <Card
              key={r.id}
              className={cn(
                "overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md",
                "animate-in fade-in slide-in-from-bottom-2",
                r.status === "pending" && r.severity === "high" && "border-red-500/25 ring-1 ring-red-500/10",
              )}
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms`, animationFillMode: "backwards" }}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(r.status)}
                      <Badge variant="outline" className={cn("rounded-full capitalize", sevClass[r.severity])}>
                        {r.severity} · {r.severityPercent}%
                      </Badge>
                      {r.platformAction === "drone" && (
                        <Badge variant="outline" className="rounded-full gap-1 border-amber-500/40 text-amber-900 dark:text-amber-100">
                          <ShieldAlert className="h-3 w-3" />
                          Drone lead
                        </Badge>
                      )}
                      {r.platformAction === "ngo" && (
                        <Badge variant="outline" className="rounded-full border-sky-500/35 text-sky-800 dark:text-sky-200">
                          NGO lead
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="font-heading text-lg leading-snug pt-1">{r.locationLabel}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="tabular-nums">
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </span>
                      <span className="text-border">·</span>
                      {new Date(r.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {r.imageUrl && (
                  <img src={r.imageUrl} alt="" className="w-full max-h-48 rounded-xl object-cover border border-border/60" />
                )}
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground leading-relaxed">
                  <span className="font-semibold text-primary">Severity guidance: </span>
                  {requestSeverityGuidance(r)}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>
                    Plastic: <span className="font-medium text-foreground">{r.plasticDetected ? "Detected" : "Not detected"}</span>
                  </span>
                  <span>
                    Report ID: <span className="font-mono text-foreground">{r.reportId}</span>
                  </span>
                </div>
                {r.notes && <p className="text-sm text-muted-foreground border-l-2 border-border pl-3">{r.notes}</p>}
                {r.assignedWorkerGroupLabels && r.assignedWorkerGroupLabels.length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                    <span className="font-semibold text-foreground">Authority-assigned groups: </span>
                    <span className="text-muted-foreground">{r.assignedWorkerGroupLabels.join(" · ")}</span>
                  </div>
                )}
                {r.assignedWorkerIds && r.assignedWorkerIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Crew members (union): </span>
                    {r.assignedWorkerIds.map(workerLabel).join(", ")}
                  </p>
                )}

                {r.status === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      type="button"
                      className="rounded-xl gap-2 flex-1"
                      disabled={busy === r.id}
                      onClick={() => void run(r.id, "accept")}
                    >
                      <Check className="h-4 w-4" />
                      Accept & create mission
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl gap-2 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={busy === r.id}
                      onClick={() => void run(r.id, "decline")}
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                )}
                {r.status !== "pending" && r.decidedAt && (
                  <p className="text-xs text-muted-foreground">Resolved {new Date(r.decidedAt).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
