import { Map, Satellite } from "lucide-react";
import type { MapBasemapId } from "@/lib/map-tile-providers";
import { cn } from "@/lib/utils";

type MapBasemapToggleProps = {
  value: MapBasemapId;
  onChange: (next: MapBasemapId) => void;
  className?: string;
};

export function MapBasemapToggle({ value, onChange, className }: MapBasemapToggleProps) {
  return (
    <div
      className={cn(
        "flex rounded-xl border border-border/80 bg-background/95 backdrop-blur-sm shadow-sm p-0.5 gap-0.5",
        className,
      )}
      role="group"
      aria-label="Map basemap"
    >
      <button
        type="button"
        onClick={() => onChange("street")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
          value === "street" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80",
        )}
      >
        <Map className="h-3.5 w-3.5 shrink-0" />
        Map
      </button>
      <button
        type="button"
        onClick={() => onChange("satellite")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
          value === "satellite" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80",
        )}
      >
        <Satellite className="h-3.5 w-3.5 shrink-0" />
        Satellite
      </button>
    </div>
  );
}
