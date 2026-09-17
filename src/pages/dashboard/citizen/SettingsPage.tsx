import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { clearSession } from "@/lib/session";
import { getSettings, updatePassword, updateSettings } from "@/lib/citizen-store";
import { useState } from "react";

export default function SettingsPage() {
  useCitizenVersion();
  const s = getSettings();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  const patch = (partial: Parameters<typeof updateSettings>[0]) => {
    updateSettings(partial);
    toast.success("Settings saved (PUT /settings)");
  };

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  const savePwd = () => {
    if (newPwd.length < 6) {
      toast.error("New password should be at least 6 characters.");
      return;
    }
    updatePassword(curPwd, newPwd);
    setPwdOpen(false);
    setCurPwd("");
    setNewPwd("");
    toast.success("Password updated (demo)");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Settings</CardTitle>
          <CardDescription>Notifications, appearance, and security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
              <div>
                <Label className="text-base">Push alerts</Label>
                <p className="text-xs text-muted-foreground mt-1">Master toggle for in-app alerts</p>
              </div>
              <Switch checked={s.pushNotifications} onCheckedChange={(v) => patch({ pushNotifications: v })} />
            </div>
            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <Label className="text-base">Alert types</Label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">High pollution nearby</span>
                <Switch
                  checked={s.alertTypes.pollutionNearby}
                  onCheckedChange={(v) => patch({ alertTypes: { ...s.alertTypes, pollutionNearby: v } })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Drone dispatched</span>
                <Switch checked={s.alertTypes.drone} onCheckedChange={(v) => patch({ alertTypes: { ...s.alertTypes, drone: v } })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Cleanup completed</span>
                <Switch checked={s.alertTypes.cleanup} onCheckedChange={(v) => patch({ alertTypes: { ...s.alertTypes, cleanup: v } })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">NGO activity</span>
                <Switch checked={s.alertTypes.ngo} onCheckedChange={(v) => patch({ alertTypes: { ...s.alertTypes, ngo: v } })} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
              <div>
                <Label className="text-base">Email digests</Label>
                <p className="text-xs text-muted-foreground mt-1">Weekly summary of your impact</p>
              </div>
              <Switch checked={s.emailDigest} onCheckedChange={(v) => patch({ emailDigest: v })} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
              <div>
                <Label className="text-base">Share approximate location</Label>
                <p className="text-xs text-muted-foreground mt-1">Improves hotspot accuracy</p>
              </div>
              <Switch
                checked={s.shareApproxLocation}
                onCheckedChange={(v) => patch({ shareApproxLocation: v, ...(!v ? { liveLocationTracking: false } : {}) })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
              <div>
                <Label className="text-base">Live GPS tracking</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Continuous position updates on the map and dashboard (device only — not sent to a server in this demo).
                </p>
              </div>
              <Switch
                checked={s.liveLocationTracking}
                disabled={!s.shareApproxLocation}
                onCheckedChange={(v) => patch({ liveLocationTracking: v })}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
            <div className="rounded-xl border border-border/60 p-4 space-y-2">
              <Label>Theme</Label>
              <Select value={theme ?? "system"} onValueChange={(v) => setTheme(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Dark mode toggle is also in the top bar.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Security</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setPwdOpen(true)}>
                Change password
              </Button>
              <Button type="button" variant="destructive" className="rounded-full gap-2" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Demo only — no server request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="scur">Current</Label>
              <Input id="scur" type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snw">New</Label>
              <Input id="snw" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPwdOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={savePwd}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
