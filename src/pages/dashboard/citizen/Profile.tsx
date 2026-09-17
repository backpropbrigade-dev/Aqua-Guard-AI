import { useRef, useState } from "react";
import { Mail, User } from "lucide-react";
import { toast } from "sonner";
import { getSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { getMyReports, getProfile, updatePassword, updateProfile } from "@/lib/citizen-store";

export default function Profile() {
  useCitizenVersion();
  const session = getSession();
  const profile = getProfile();
  const reports = getMyReports();
  const cleanupsTriggered = reports.filter((r) => r.action === "drone" || r.status === "cleaned").length;

  const [displayName, setDisplayName] = useState(() => getProfile().displayName);
  const [email, setEmail] = useState(
    () => getProfile().email || (getSession()?.identifier?.includes("@") ? getSession()!.identifier : ""),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  const photo = profile.photoDataUrl;

  const onPhoto = (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => {
      const url = typeof r.result === "string" ? r.result : null;
      if (url) updateProfile({ photoDataUrl: url });
      toast.success("Photo updated");
    };
    r.readAsDataURL(f);
  };

  const saveProfile = () => {
    updateProfile({ displayName: displayName.trim(), email: email.trim() });
    toast.success("Profile saved (GET/PUT /profile)");
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
    toast.success("Password updated (demo — not sent to a server)");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Profile</CardTitle>
          <CardDescription>GET /profile — name, email, photo, activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-primary ring-2 ring-offset-2 ring-offset-background ring-primary/20 hover:opacity-90 transition-opacity"
              onClick={() => fileRef.current?.click()}
            >
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <User className="h-9 w-9" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
            <div className="min-w-0">
              <p className="font-heading font-semibold text-lg">{displayName || "Citizen"}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {email || session?.identifier || "—"}
              </p>
              <Button type="button" variant="link" className="h-auto p-0 mt-1 text-xs" onClick={() => fileRef.current?.click()}>
                Change photo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display">Display name</Label>
            <Input id="display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Activity stats</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>Reports submitted: {reports.length}</li>
              <li>Cleanups triggered / completed (approx.): {cleanupsTriggered}</li>
              <li>Points earned: {profile.points}</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full" type="button" onClick={saveProfile}>
              Save changes
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPwdOpen(true)}>
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>PUT /profile/update (demo — stored locally only)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cur">Current password</Label>
              <Input id="cur" type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nw">New password</Label>
              <Input id="nw" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPwdOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={savePwd}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
