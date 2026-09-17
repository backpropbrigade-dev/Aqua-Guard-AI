import { getSession } from "@/lib/session";
import { getWorkerSelfView, updateWorkerStatus, type WorkerRole, type WorkerStatus } from "@/lib/worker-store";
import { useWorkerVersion } from "@/hooks/useWorkerVersion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const fieldRoleLabels: Record<WorkerRole, string> = {
  cleanup_crew: "Cleanup crew",
  drone_operator: "Drone operator",
  coastal_inspector: "Coastal inspector",
};

const statusOptions: WorkerStatus[] = ["available", "on_assignment", "off_duty", "training"];

const statusLabels: Record<WorkerStatus, string> = {
  available: "Available",
  on_assignment: "On assignment",
  off_duty: "Off duty",
  training: "Training",
};

export default function WorkerProfile() {
  useWorkerVersion();
  const session = getSession();
  const { profile, matchedRegistry } = getWorkerSelfView(session?.identifier ?? "");

  const onStatusChange = (v: string) => {
    if (!matchedRegistry) {
      toast.message("Link a registry profile (e.g. priya@aquaguard.demo) to update status.");
      return;
    }
    updateWorkerStatus(profile.id, v as WorkerStatus);
    toast.success("Status updated");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Field role, certifications, and availability.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">{profile.name}</CardTitle>
          <CardDescription>
            {fieldRoleLabels[profile.workerRole]} · {profile.region}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Availability</Label>
            <Select value={profile.status} onValueChange={onStatusChange} disabled={!matchedRegistry}>
              <SelectTrigger className="rounded-xl max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!matchedRegistry && (
              <p className="text-xs text-muted-foreground">Status changes apply when your login matches a worker in the admin registry.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Certifications</Label>
            <ul className="rounded-xl border border-border/60 bg-muted/30 divide-y divide-border/60">
              {profile.certifications.map((c) => (
                <li key={c} className="px-4 py-3 text-sm">
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Missions completed</p>
              <p className="font-heading text-2xl font-bold mt-1">{profile.missionsCompleted}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Hours this month</p>
              <p className="font-heading text-2xl font-bold mt-1">{profile.hoursThisMonth}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
