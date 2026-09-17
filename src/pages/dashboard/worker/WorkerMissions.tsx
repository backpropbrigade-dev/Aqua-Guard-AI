import { getSession } from "@/lib/session";
import { getWorkerSelfView } from "@/lib/worker-store";
import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMissionsForWorkerRegion, submitWorkerMissionProof, type NgoMission } from "@/lib/ngo-store";
import { useWorkerVersion } from "@/hooks/useWorkerVersion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function statusDisplay(status: NgoMission["status"]): string {
  const map: Record<NgoMission["status"], string> = {
    assigned: "Assigned",
    in_progress: "In progress",
    pending_verification: "Proof pending (authority)",
    completed: "Completed",
    deferred: "Deferred",
  };
  return map[status] ?? status;
}

const severityClass: Record<NgoMission["severity"], string> = {
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  high: "bg-destructive/15 text-destructive",
};

export default function WorkerMissions() {
  useWorkerVersion();
  const session = getSession();
  const { profile } = getWorkerSelfView(session?.identifier ?? "");
  const missions = getMissionsForWorkerRegion(profile.region);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleFile = (m: NgoMission, kind: "before" | "after", file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const key = `${m.id}-${kind}`;
    setBusyKey(key);
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      const res = submitWorkerMissionProof(m.id, kind, url);
      setBusyKey(null);
      if (!res.ok) {
        if (res.reason === "bad_status") toast.error("Upload is available only when the mission is open.");
        else toast.error("Could not submit the photo.");
        return;
      }
      toast.success(`Photo submitted — awaiting authority review (${kind}).`);
    };
    reader.onerror = () => {
      setBusyKey(null);
      toast.error("Could not read the image.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">My missions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assignments near <span className="font-medium text-foreground">{profile.region}</span>. Data is shared with the NGO workspace on this device.
        </p>
      </div>

      <div className="space-y-4">
        {missions.map((m) => (
          <Card key={m.id} className="border-border/70 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="font-heading text-lg leading-tight">{m.title}</CardTitle>
                <Badge variant="outline" className={cn("shrink-0 border-0", severityClass[m.severity])}>
                  {m.severity} severity
                </Badge>
              </div>
              <CardDescription>
                {m.region} · Due {new Date(m.dueBy).toLocaleDateString()} · {m.source.replace(/_/g, " ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">Status: {statusDisplay(m.status)}</span>
                {m.plasticEstimateKg != null && (
                  <span className="rounded-md bg-muted px-2 py-1">~{m.plasticEstimateKg} kg plastic est.</span>
                )}
              </div>
              {m.notes && <p className="text-muted-foreground">{m.notes}</p>}

              <div className="grid gap-3 pt-2">
                <div className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.04] p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Camera className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Upload field evidence</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submit before/after photos. Your uploads will be reflected in the authority portal for approval.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`worker-before-${m.id}`} className="text-xs text-muted-foreground">
                        Before photo
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`worker-before-${m.id}`}
                          type="file"
                          accept="image/*"
                          disabled={busyKey === `${m.id}-before`}
                          className="cursor-pointer rounded-xl"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            handleFile(m, "before", f);
                            e.target.value = "";
                          }}
                        />
                        {busyKey === `${m.id}-before` && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />}
                      </div>
                      {m.workerBeforeImageUrl && (
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-2 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Status: {m.workerBeforeReviewStatus ?? "pending"}
                          </p>
                          <img
                            src={m.workerBeforeImageUrl}
                            alt=""
                            className="w-full max-h-40 object-contain rounded-lg border border-border/60 bg-background"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`worker-after-${m.id}`} className="text-xs text-muted-foreground">
                        After photo
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`worker-after-${m.id}`}
                          type="file"
                          accept="image/*"
                          disabled={busyKey === `${m.id}-after`}
                          className="cursor-pointer rounded-xl"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            handleFile(m, "after", f);
                            e.target.value = "";
                          }}
                        />
                        {busyKey === `${m.id}-after` && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />}
                      </div>
                      {m.workerAfterImageUrl && (
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-2 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Status: {m.workerAfterReviewStatus ?? "pending"}
                          </p>
                          <img
                            src={m.workerAfterImageUrl}
                            alt=""
                            className="w-full max-h-40 object-contain rounded-lg border border-border/60 bg-background"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {missions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">No missions to show.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
