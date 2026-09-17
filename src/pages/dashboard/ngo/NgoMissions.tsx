import { useState } from "react";
import { Camera, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNgoVersion } from "@/hooks/useNgoVersion";
import {
  getNgoMissions,
  submitMissionCompletionProof,
  updateMissionStatus,
  type NgoMission,
  type NgoMissionStatus,
} from "@/lib/ngo-store";
import { cn } from "@/lib/utils";

const statusLabel: Record<NgoMissionStatus, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  pending_verification: "Proof pending (authority)",
  completed: "Completed (verified)",
  deferred: "Deferred",
};

const editableStatuses: NgoMissionStatus[] = ["assigned", "in_progress", "deferred"];

const sevClass: Record<NgoMission["severity"], string> = {
  low: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30",
  high: "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30",
};

export default function NgoMissions() {
  useNgoVersion();
  const missions = getNgoMissions();
  const [proofBusyId, setProofBusyId] = useState<string | null>(null);

  const handleProofFile = (m: NgoMission, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setProofBusyId(m.id);
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      const res = submitMissionCompletionProof(m.id, url);
      setProofBusyId(null);
      if (!res.ok) {
        if (res.reason === "bad_status") toast.error("Set mission to in progress (or assigned), then submit proof.");
        else toast.error("Could not submit proof.");
        return;
      }
      toast.success("Photo submitted — authority will verify before rewards are issued.");
    };
    reader.onerror = () => {
      setProofBusyId(null);
      toast.error("Could not read the image.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Field missions</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Update operational status as your team progresses. To close a mission and earn partner points, upload an <strong>after cleanup</strong> photo — the authority verifies it before rewards
          are released.
        </p>
      </div>

      <div className="grid gap-4">
        {missions.map((m, i) => (
          <Card
            key={m.id}
            className={cn(
              "border-border/70 shadow-sm transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-2",
            )}
            style={{ animationDelay: `${Math.min(i * 60, 400)}ms`, animationFillMode: "backwards" }}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-lg leading-tight">{m.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {m.region}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={cn("rounded-full capitalize", sevClass[m.severity])}>
                    {m.severity}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    P{m.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  Source: <span className="text-foreground font-medium">{m.source.replace(/_/g, " ")}</span>
                </span>
                {m.plasticEstimateKg != null && (
                  <span>
                    Est. plastic: <span className="text-foreground font-medium">{m.plasticEstimateKg} kg</span>
                  </span>
                )}
                <span className="tabular-nums">Due {new Date(m.dueBy).toLocaleDateString()}</span>
              </div>
              {m.notes && <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{m.notes}</p>}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm text-muted-foreground shrink-0">Status</span>
                {m.status === "pending_verification" || m.status === "completed" ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit rounded-xl px-3 py-1.5 text-sm font-medium",
                      m.status === "pending_verification" && "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                      m.status === "completed" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
                    )}
                  >
                    {statusLabel[m.status]}
                  </Badge>
                ) : (
                  <Select value={m.status} onValueChange={(v) => updateMissionStatus(m.id, v as NgoMissionStatus)}>
                    <SelectTrigger className="w-full sm:w-[240px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {editableStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusLabel[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {m.status === "pending_verification" && m.completionProofImageUrl && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Submitted proof (awaiting authority)</p>
                  <img
                    src={m.completionProofImageUrl}
                    alt=""
                    className="w-full max-h-48 object-contain rounded-lg border border-border/60 bg-background"
                  />
                </div>
              )}

              {m.status === "completed" && m.completionProofImageUrl && (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Verified cleanup photo</p>
                  <img
                    src={m.completionProofImageUrl}
                    alt=""
                    className="w-full max-h-40 object-contain rounded-lg border border-border/60 bg-background"
                  />
                </div>
              )}

              {(m.status === "assigned" || m.status === "in_progress") && (
                <div className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.04] p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Camera className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Submit completion photo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Upload a clear after photo of the cleaned area. You cannot mark “completed” manually — authority verifies the image first.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor={`proof-${m.id}`} className="text-xs text-muted-foreground">
                      After-cleanup image
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`proof-${m.id}`}
                        type="file"
                        accept="image/*"
                        disabled={proofBusyId === m.id}
                        className="cursor-pointer rounded-xl"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          handleProofFile(m, f);
                          e.target.value = "";
                        }}
                      />
                      {proofBusyId === m.id && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
