import { useState } from "react";
import { Camera, Check, MapPin, X, Brain, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import {
  getMissionsAwaitingProofVerification,
  getMissionsAwaitingWorkerProofReview,
  reviewMissionCompletionProof,
  reviewWorkerMissionProof,
  type NgoMission,
} from "@/lib/ngo-store";
import { cn } from "@/lib/utils";

const sevClass: Record<NgoMission["severity"], string> = {
  low: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30",
  high: "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30",
};

const sevTextClass: Record<NgoMission["severity"], string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

/** AI Analysis display component for worker uploaded photos */
function AiAnalysisBadge({ analysis }: { 
  analysis: { 
    plasticDetected?: boolean; 
    severityPercent?: number; 
    severity?: NgoMission["severity"];
    boxes?: { x: number; y: number; w: number; h: number }[];
  } 
}) {
  if (!analysis.plasticDetected && analysis.severityPercent === undefined) return null;
  
  const severity = analysis.severity ?? "low";
  const hasPlastic = analysis.plasticDetected;
  const boxCount = analysis.boxes?.length ?? 0;
  
  return (
    <div className="rounded-lg border border-border/60 bg-background p-2 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs">
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-foreground">AI Analysis</span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge 
          variant="outline" 
          className={cn(
            "rounded-md",
            hasPlastic ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/50 bg-emerald-500/10"
          )}
        >
          {hasPlastic ? (
            <><AlertTriangle className="h-3 w-3 mr-1" /> Plastic detected</>
          ) : (
            <><CheckCircle className="h-3 w-3 mr-1" /> No plastic</>
          )}
        </Badge>
        {analysis.severityPercent !== undefined && (
          <Badge variant="outline" className={cn("rounded-md", sevClass[severity])}>
            Severity: {analysis.severityPercent}%
          </Badge>
        )}
        {boxCount > 0 && (
          <Badge variant="secondary" className="rounded-md">
            {boxCount} region{boxCount > 1 ? "s" : ""} detected
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function AdminMissionProofReview() {
  useAdminDashboardVersion();
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = getMissionsAwaitingProofVerification();
  const workerPending = getMissionsAwaitingWorkerProofReview();

  const run = (id: string, decision: "approve" | "reject") => {
    const row = pending.find((x) => x.id === id);
    setBusyId(id);
    try {
      reviewMissionCompletionProof(id, decision);
      if (decision === "approve") {
        toast.success(
          row?.source === "citizen_report"
            ? "Cleanup verified — NGO and assigned workers received reward points."
            : "Cleanup verified — mission closed. Partner rewards apply only to citizen-sourced missions.",
        );
      } else {
        toast.success("Proof rejected — NGO can resubmit a new photo.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const runWorker = (id: string, kind: "before" | "after", decision: "approve" | "reject") => {
    setBusyId(`${id}-${kind}`);
    try {
      reviewWorkerMissionProof(id, kind, decision);
      toast.success(decision === "approve" ? "Worker upload approved." : "Worker upload rejected.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Verify cleanup proof</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          NGO partner missions move here after the team uploads an after photo. Approve only when the evidence matches the site — partner and assigned worker reward points are released on approval
          (citizen-sourced missions only).
        </p>
      </div>

      {pending.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Camera className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-foreground">No cleanups awaiting verification</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              When an NGO marks work done with a photo on Field missions, it will appear here for your review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-5">
          {pending.map((m) => (
            <li key={m.id}>
              <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="font-heading text-lg leading-tight">{m.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {m.region}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("rounded-full capitalize shrink-0", sevClass[m.severity])}>
                      {m.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      Source: <span className="text-foreground font-medium">{m.source.replace(/_/g, " ")}</span>
                    </span>
                    {m.completionProofSubmittedAt && (
                      <span className="tabular-nums">
                        Submitted {new Date(m.completionProofSubmittedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {m.notes && <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{m.notes}</p>}
                  <div className="rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2 border-b border-border/60 bg-muted/40">
                      After photo
                    </p>
                    <div className="p-2 sm:p-3">
                      {m.completionProofImageUrl && (
                        <img
                          src={m.completionProofImageUrl}
                          alt="Cleanup proof"
                          className="w-full max-h-[min(52vh,420px)] object-contain rounded-lg bg-background"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-xl gap-2"
                      disabled={busyId === m.id}
                      onClick={() => run(m.id, "approve")}
                    >
                      <Check className="h-4 w-4" />
                      Approve & release rewards
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={busyId === m.id}
                      onClick={() => run(m.id, "reject")}
                    >
                      <X className="h-4 w-4" />
                      Reject proof
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4">
        <h3 className="font-heading text-xl font-semibold text-foreground">Verify worker uploads</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Field workers can upload before/after evidence from the worker portal. Review and approve or reject each upload.
        </p>
      </div>

      {workerPending.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Camera className="h-9 w-9 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-foreground">No worker uploads awaiting review</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">When workers submit evidence from their missions page, it will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-5">
          {workerPending.map((m) => (
            <li key={m.id}>
              <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="font-heading text-lg leading-tight">{m.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {m.region}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("rounded-full capitalize shrink-0", sevClass[m.severity])}>
                      {m.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      Source: <span className="text-foreground font-medium">{m.source.replace(/_/g, " ")}</span>
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1">Status: {m.status.replace(/_/g, " ")}</span>
                  </div>

                  {(m.workerBeforeReviewStatus === "pending" || m.workerAfterReviewStatus === "pending") && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {m.workerBeforeReviewStatus === "pending" && m.workerBeforeImageUrl && (
                        <div className="rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2 border-b border-border/60 bg-muted/40 flex items-center gap-2">
                            <Brain className="h-3.5 w-3.5" />
                            Worker before photo
                          </p>
                          <div className="p-2 sm:p-3 space-y-3">
                            <img
                              src={m.workerBeforeImageUrl}
                              alt="Worker before"
                              className="w-full max-h-[min(42vh,320px)] object-contain rounded-lg bg-background"
                            />
                            <AiAnalysisBadge 
                              analysis={{
                                plasticDetected: m.workerBeforePlasticDetected,
                                severityPercent: m.workerBeforeSeverityPercent,
                                severity: m.workerBeforeSeverity,
                                boxes: m.workerBeforeBoxes,
                              }} 
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                className="rounded-xl gap-2"
                                disabled={busyId === `${m.id}-before`}
                                onClick={() => runWorker(m.id, "before", "approve")}
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={busyId === `${m.id}-before`}
                                onClick={() => runWorker(m.id, "before", "reject")}
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {m.workerAfterReviewStatus === "pending" && m.workerAfterImageUrl && (
                        <div className="rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2 border-b border-border/60 bg-muted/40 flex items-center gap-2">
                            <Brain className="h-3.5 w-3.5" />
                            Worker after photo
                          </p>
                          <div className="p-2 sm:p-3 space-y-3">
                            <img
                              src={m.workerAfterImageUrl}
                              alt="Worker after"
                              className="w-full max-h-[min(42vh,320px)] object-contain rounded-lg bg-background"
                            />
                            <AiAnalysisBadge 
                              analysis={{
                                plasticDetected: m.workerAfterPlasticDetected,
                                severityPercent: m.workerAfterSeverityPercent,
                                severity: m.workerAfterSeverity,
                                boxes: m.workerAfterBoxes,
                              }} 
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                className="rounded-xl gap-2"
                                disabled={busyId === `${m.id}-after`}
                                onClick={() => runWorker(m.id, "after", "approve")}
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={busyId === `${m.id}-after`}
                                onClick={() => runWorker(m.id, "after", "reject")}
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
