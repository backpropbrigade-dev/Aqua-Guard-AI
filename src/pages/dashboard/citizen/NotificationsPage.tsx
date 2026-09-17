import { useEffect } from "react";
import { Bell, CheckCheck, Leaf, Plane, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type CitizenNotification, type NotificationType, simulateLiveUpdate } from "@/lib/citizen-store";
import { cn } from "@/lib/utils";

function iconForType(t: NotificationType) {
  switch (t) {
    case "pollution_nearby":
      return Bell;
    case "drone":
      return Plane;
    case "cleanup":
      return Sparkles;
    case "ngo":
      return Leaf;
    default:
      return Bell;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

export default function NotificationsPage() {
  useCitizenVersion();
  const items = getNotifications();

  useEffect(() => {
    const id = window.setInterval(() => simulateLiveUpdate(), 32000);
    return () => window.clearInterval(id);
  }, []);

  const onRowClick = (n: CitizenNotification) => {
    if (!n.read) markNotificationRead(n.id);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading">Notifications</CardTitle>
            <CardDescription>GET /notifications + WebSocket-style demo pushes</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => markAllNotificationsRead()}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">You&apos;re all caught up.</p>
          ) : (
            items.map((n) => {
              const Icon = iconForType(n.type);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onRowClick(n)}
                  className={cn(
                    "flex w-full gap-4 rounded-xl border p-4 text-left transition-colors",
                    !n.read ? "border-primary/25 bg-primary/5" : "border-border/60 bg-card/50",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-destructive mt-1.5" aria-label="Unread" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-2 capitalize">{n.type.replace("_", " ")} · {formatTime(n.createdAt)}</p>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
