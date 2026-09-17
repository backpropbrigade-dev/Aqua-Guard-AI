import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Camera,
  ChevronRight,
  Droplets,
  Filter,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { getMyReports, markReportCleaned, type PollutionReport, type ReportStatus, type Severity } from "@/lib/citizen-store";
import { cn } from "@/lib/utils";

const statusStyle: Record<ReportStatus, string> = {
  uploaded: "bg-muted/80 text-muted-foreground border-border/80",
  detected: "bg-primary/12 text-primary border-primary/35",
  cleaning: "bg-amber-500/12 text-amber-800 dark:text-amber-100 border-amber-500/35",
  cleaned: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/35",
};

const severityStyle: Record<Severity, string> = {
  low: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  medium: "bg-amber-500/12 text-amber-900 dark:text-amber-100 border-amber-500/35",
  high: "bg-red-500/12 text-red-800 dark:text-red-200 border-red-500/35",
};

function statusLabel(s: ReportStatus): string {
  const map: Record<ReportStatus, string> = {
    uploaded: "Uploaded",
    detected: "Detected",
    cleaning: "Cleaning",
    cleaned: "Cleaned",
  };
  return map[s];
}

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 10)}…` : id;
}

function authorityBadgeLabel(r: PollutionReport): string | null {
  if (r.authorityStatus === "pending_review") return "Authority review";
  if (r.authorityStatus === "rejected") return "Not verified";
  if (r.authorityStatus === "approved") return "Authority verified";
  return null;
}

function authorityBadgeClass(label: string): string {
  if (label === "Not verified") return "bg-red-500/15 border-red-500/40 text-red-900 dark:text-red-100";
  if (label === "Authority verified") return "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-100";
  return "bg-amber-500/20 border-amber-500/40 text-amber-950 dark:text-amber-100";
}

function ngoPartnerLine(r: PollutionReport): string | null {
  if (!r.ngoPartnerStatus) return null;
  switch (r.ngoPartnerStatus) {
    case "pending":
      return "NGO: awaiting partner response";
    case "accepted":
      return "NGO: accepted — field mission created";
    case "declined":
      return "NGO: declined";
    default:
      return null;
  }
}

export default function MyReports() {
  useCitizenVersion();
  const reports = getMyReports();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<PollutionReport | null>(null);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      const hay = `${r.locationLabel} ${r.id} ${r.notes ?? ""}`.toLowerCase();
      if (q.trim() && !hay.includes(q.trim().toLowerCase())) return false;
      const t = new Date(r.createdAt).getTime();
      if (from) {
        const start = new Date(from).setHours(0, 0, 0, 0);
        if (t < start) return false;
      }
      if (to) {
        const end = new Date(to).setHours(23, 59, 59, 999);
        if (t > end) return false;
      }
      return true;
    });
  }, [reports, q, statusFilter, severityFilter, from, to]);

  const hasActiveFilters =
    q.trim() !== "" || statusFilter !== "all" || severityFilter !== "all" || from !== "" || to !== "";

  const detailAuthLabel = selected ? authorityBadgeLabel(selected) : null;

  const clearFilters = () => {
    setQ("");
    setStatusFilter("all");
    setSeverityFilter("all");
    setFrom("");
    setTo("");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 px-1 sm:px-0">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-secondary/[0.06] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/60 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Your submissions
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">My reports</h1>
            <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">
              Track everything you’ve filed: filters help you find a report fast; open a card for before/after media and cleanup status.
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{reports.length}</span> total
              {hasActiveFilters && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">{filtered.length}</span> shown
                </>
              )}
            </p>
          </div>
          <div className="w-full lg:max-w-sm shrink-0">
            <Label htmlFor="report-search" className="sr-only">
              Search reports
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="report-search"
                placeholder="Search by place, ID, or notes…"
                className="h-11 rounded-xl border-border/80 bg-background/90 pl-10 pr-4 shadow-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-border/70 shadow-md">
        <CardHeader className="space-y-4 border-b border-border/50 bg-muted/20 pb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-heading text-lg">Filters</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Refine the list — same fields as API query patterns for demos.</CardDescription>
            </div>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full text-muted-foreground shrink-0" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Status
              </Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="detected">Detected</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="cleaned">Cleaned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Severity</Label>
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
                <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date range
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input type="date" className="h-11 rounded-xl border-border/80 bg-background sm:flex-1" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" className="h-11 rounded-xl border-border/80 bg-background sm:flex-1" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Droplets className="h-7 w-7" />
              </div>
              <p className="font-heading text-lg font-semibold text-foreground">
                {reports.length === 0 ? "No reports yet" : "No matches"}
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {reports.length === 0
                  ? "Submit your first sighting to see it listed here with AI severity and routing."
                  : "Try widening your search or clearing filters to see more reports."}
              </p>
              {reports.length === 0 && (
                <Button className="mt-6 rounded-full gap-2" asChild>
                  <Link to="/dashboard/citizen/report">
                    <Camera className="h-4 w-4" />
                    Report pollution
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => {
                const ngoLine = ngoPartnerLine(r);
                const authBadge = authorityBadgeLabel(r);
                return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={cn(
                      "group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-sm transition-all duration-200",
                      "hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    onClick={() => setSelected(r)}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      {r.mediaType === "video" ? (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ocean-mid/20 to-primary/10 text-sm text-muted-foreground">
                          Video report
                        </div>
                      ) : (
                        <img src={r.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      )}
                      <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm", statusStyle[r.status])}>
                          {statusLabel(r.status)}
                        </Badge>
                        {authBadge && (
                          <Badge
                            variant="outline"
                            className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm", authorityBadgeClass(authBadge))}
                          >
                            {authBadge}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute right-2 top-2">
                        <Badge variant="outline" className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur-sm", severityStyle[r.severity])}>
                          {r.severity} · {r.severityPercent}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 min-w-0 flex-1 font-semibold leading-snug text-foreground">{r.locationLabel}</p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="tabular-nums">
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground/90">{shortId(r.id)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                      {ngoLine && (
                        <p className="text-[11px] font-medium text-ocean-mid dark:text-ocean-light leading-snug">{ngoLine}</p>
                      )}
                    </div>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-[min(100vw-1.5rem,32rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader className="space-y-1 border-b border-border/60 bg-muted/25 px-5 py-4 text-left">
                <DialogTitle className="font-heading text-lg leading-tight pr-8">Report detail</DialogTitle>
                <DialogDescription className="line-clamp-2 text-sm">{selected.locationLabel}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[min(75vh,560px)] overflow-y-auto px-5 py-5 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
                    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                      <img src={selected.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">After cleanup</p>
                    {selected.afterImageUrl ? (
                      <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                        <img src={selected.afterImageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 text-center text-xs text-muted-foreground">
                        Pending verification
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={cn("rounded-full", statusStyle[selected.status])}>
                    {statusLabel(selected.status)}
                  </Badge>
                  <Badge variant="outline" className={cn("rounded-full capitalize", severityStyle[selected.severity])}>
                    {selected.severity} · {selected.severityPercent}%
                  </Badge>
                  {selected.plasticDetected && (
                    <Badge variant="outline" className="rounded-full border-secondary/40 bg-secondary/10">
                      Plastic detected
                    </Badge>
                  )}
                  {detailAuthLabel && (
                    <Badge variant="outline" className={cn("rounded-full", authorityBadgeClass(detailAuthLabel))}>
                      {detailAuthLabel}
                    </Badge>
                  )}
                </div>

                <Separator />

                <dl className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Action</dt>
                    <dd className="text-right font-medium">
                      {selected.action === "drone" ? "Drone deployment" : selected.action === "ngo" ? "NGO partner" : "—"}
                    </dd>
                  </div>
                  {ngoPartnerLine(selected) && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">NGO partner</dt>
                      <dd className="text-right font-medium text-primary max-w-[60%]">{ngoPartnerLine(selected)}</dd>
                    </div>
                  )}
                  {detailAuthLabel && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Authority</dt>
                      <dd className="text-right font-medium max-w-[60%]">{detailAuthLabel}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Coordinates</dt>
                    <dd className="text-right font-mono text-xs tabular-nums">
                      {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Report ID</dt>
                    <dd className="max-w-[55%] break-all text-right font-mono text-xs">{selected.id}</dd>
                  </div>
                  {selected.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground mb-1">Notes</dt>
                      <dd className="rounded-lg border border-border/60 bg-muted/20 p-3 text-foreground">{selected.notes}</dd>
                    </div>
                  )}
                </dl>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
                  <div className="flex gap-1">
                    {(["uploaded", "detected", "cleaning", "cleaned"] as const).map((step, i) => {
                      const order = ["uploaded", "detected", "cleaning", "cleaned"] as const;
                      const idx = order.indexOf(selected.status);
                      const active = i <= idx;
                      return (
                        <span
                          key={step}
                          className={cn(
                            "flex-1 truncate px-1 py-2 text-center text-[10px] font-medium capitalize rounded-lg border transition-colors sm:text-xs",
                            active ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground",
                          )}
                        >
                          {step}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {selected.status !== "cleaned" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 w-full rounded-xl"
                    onClick={() => {
                      markReportCleaned(selected.id);
                      setSelected(null);
                    }}
                  >
                    Mark cleanup completed (demo)
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
