import { MapPin, MapPinOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveLocationVersion } from "@/hooks/useLiveLocation";
import { getLiveLocationState } from "@/lib/live-location";

export function LiveLocationBadge() {
  useLiveLocationVersion();
  const { status, position } = getLiveLocationState();

  if (status === "idle" || status === "pending") {
    return (
      <span
        className={cn(
          "hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
          status === "pending" && "text-foreground",
        )}
      >
        {status === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
        {status === "pending" ? "Locating…" : "GPS idle"}
      </span>
    );
  }

  if (status === "denied" || status === "unavailable") {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/15 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
        <MapPinOff className="h-3 w-3 shrink-0" />
        Location off
      </span>
    );
  }

  return (
    <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ocean-light opacity-55" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Live
      {position?.accuracyM != null && <span className="font-normal text-muted-foreground">±{Math.round(position.accuracyM)}m</span>}
    </span>
  );
}
