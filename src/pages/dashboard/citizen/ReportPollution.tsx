import { useCallback, useEffect, useRef, useState } from "react";
import { reverseGeocodeAddress } from "@/lib/geocoding";
import { Camera, ImagePlus, Loader2, MapPin, Sparkles, Video } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PollutionMapView } from "@/components/dashboard/citizen/PollutionMapView";
import {
  DEFAULT_MAP_CENTER,
  type PollutionReport,
  severityFromPercent,
  uploadReport,
} from "@/lib/citizen-store";
import { cn } from "@/lib/utils";
import { useLiveLocationVersion } from "@/hooks/useLiveLocation";
import { getLiveLocationState } from "@/lib/live-location";

function formatLocationLabel(lat: number, lng: number) {
  return `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export default function ReportPollution() {
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [lat, setLat] = useState(DEFAULT_MAP_CENTER[0]);
  const [lng, setLng] = useState(DEFAULT_MAP_CENTER[1]);
  const [locationLabel, setLocationLabel] = useState(formatLocationLabel(DEFAULT_MAP_CENTER[0], DEFAULT_MAP_CENTER[1]));
  const [notes, setNotes] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [result, setResult] = useState<{ report: PollutionReport; points: { base: number; severity: number; plastic: number; routingNote: string } } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const seededFromLive = useRef(false);
  const geoGen = useRef(0);
  const liveLv = useLiveLocationVersion();

  const applyCoordsWithPlaceName = useCallback(async (la: number, ln: number) => {
    const my = ++geoGen.current;
    setLat(la);
    setLng(ln);
    setGeoLoading(true);
    try {
      const place = await reverseGeocodeAddress(la, ln);
      if (my !== geoGen.current) return;
      setLocationLabel(place ?? formatLocationLabel(la, ln));
    } finally {
      if (my === geoGen.current) setGeoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (seededFromLive.current) return;
    const p = getLiveLocationState().position;
    if (!p) return;
    seededFromLive.current = true;
    void applyCoordsWithPlaceName(p.lat, p.lng);
  }, [liveLv, applyCoordsWithPlaceName]);

  const livePos = getLiveLocationState().position;
  const pinMapUser = livePos ? { lat: livePos.lat, lng: livePos.lng, accuracyM: livePos.accuracyM } : null;

  const revokePreview = useCallback(() => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => () => revokePreview(), [revokePreview]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const pickFile = (f: File | null, type: "image" | "video") => {
    if (!f) return;
    revokePreview();
    setFile(f);
    setMediaType(type);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setResult(null);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available in this browser.");
      return;
    }
    toast.message("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        void applyCoordsWithPlaceName(la, ln).then(() => toast.success("Location updated from GPS"));
      },
      () => toast.error("Could not read GPS — adjust pin on map."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("Camera access denied or unavailable.");
    }
  };

  const captureFrame = async () => {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) return;
    stopCamera();
    pickFile(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }), "image");
    toast.success("Photo captured");
  };

  const handleSubmit = async () => {
    if (!file && !previewUrl) {
      toast.error("Add a photo or video first.");
      return;
    }
    setSubmitting(true);
    setAiProgress(12);
    const step = window.setInterval(() => {
      setAiProgress((p) => Math.min(92, p + 9));
    }, 160);
    try {
      const { report, pointsAwarded, uavDispatched } = await uploadReport({
        file,
        mediaType,
        lat,
        lng,
        locationLabel,
        notes: notes.trim() || undefined,
      });
      window.clearInterval(step);
      setAiProgress(100);
      setResult({ report, points: pointsAwarded });
      toast.success("Report processed — AI results ready");
      if (uavDispatched) {
        toast.message("AquaGuard UAV airborne — aerial verification en route to your coordinates.", { duration: 6000 });
      }
    } catch (e) {
      window.clearInterval(step);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setAiProgress(0), 400);
    }
  };

  const sev = result ? severityFromPercent(result.report.severityPercent) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Report pollution</CardTitle>
          <CardDescription>
            Upload or capture media, confirm location on the map (toggle <strong>Satellite</strong> for real imagery), then run AI analysis (demo).
            Reports go to authority for review; eligible cases automatically put a UAV <strong>en route</strong> for over-water verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <input
            ref={imgInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null, "image")}
          />
          <input
            ref={vidInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null, "video")}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 py-6 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
              onClick={() => imgInput.current?.click()}
            >
              <ImagePlus className="h-8 w-8 text-primary" />
              <span>Upload image</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 py-6 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
              onClick={() => vidInput.current?.click()}
            >
              <Video className="h-8 w-8 text-secondary" />
              <span>Upload video</span>
            </Button>
          </div>
          <Button type="button" variant="secondary" className="w-full rounded-xl gap-2" onClick={openCamera}>
            <Camera className="h-4 w-4" />
            Capture with camera
          </Button>

          {previewUrl && (
            <div className="relative rounded-xl border border-border/60 overflow-hidden bg-muted/20">
              {mediaType === "image" ? (
                <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain bg-black/5" />
              ) : (
                <video src={previewUrl} controls className="w-full max-h-64 bg-black" />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="loc-label">Location name</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="loc-label"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="Resolved place or your own label"
                className="rounded-xl flex-1 min-w-[200px]"
                disabled={geoLoading}
              />
              <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={detectLocation} disabled={geoLoading}>
                GPS
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => setMapOpen(true)} aria-label="Pin on map">
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {geoLoading ? "Resolving place name…" : `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe what you saw…" className="rounded-xl min-h-[100px]" />
          </div>

          {submitting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI processing…
              </div>
              <Progress value={aiProgress} className="h-2 rounded-full" />
            </div>
          )}

          <Button className="w-full rounded-full" size="lg" onClick={handleSubmit} disabled={submitting || (!file && !previewUrl)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Submit report
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="font-heading">AI output</CardTitle>
            <CardDescription>Bounding boxes and severity (simulated on-device)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative rounded-xl border bg-muted/10 overflow-hidden max-h-72 mx-auto">
              {result.report.mediaType === "image" && (
                <>
                  <img src={result.report.imageUrl} alt="Analyzed" className="w-full object-contain max-h-72" />
                  <div className="absolute inset-0 pointer-events-none">
                    {result.report.boxes.map((b, i) => (
                      <div
                        key={i}
                        className="absolute border-2 border-secondary shadow-[0_0_0_1px_rgba(0,0,0,0.3)] rounded-sm bg-secondary/10"
                        style={{
                          left: `${b.x * 100}%`,
                          top: `${b.y * 100}%`,
                          width: `${b.w * 100}%`,
                          height: `${b.h * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
              {result.report.mediaType === "video" && (
                <div className="p-6 text-center text-sm text-muted-foreground">Video stored — frame analysis simulated; map uses poster thumbnail.</div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-muted-foreground">Plastic detected</p>
                <p className="font-semibold text-lg">{result.report.plasticDetected ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-muted-foreground">Severity</p>
                <p
                  className={cn(
                    "font-semibold text-lg",
                    sev === "low" && "text-emerald-600 dark:text-emerald-400",
                    sev === "medium" && "text-amber-600 dark:text-amber-400",
                    sev === "high" && "text-red-600 dark:text-red-400",
                  )}
                >
                  {result.report.severityPercent}% — {sev === "low" ? "Low (<20%)" : sev === "medium" ? "Medium (20–50%)" : "High (>50%)"}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm">
              <p className="font-medium text-foreground">Routing (after authority approves)</p>
              <p className="text-muted-foreground mt-1">{result.points.routingNote}</p>
              <p className="text-muted-foreground mt-2">
                <strong>Authority</strong> will verify your report first. NGOs only see it in their queue after approval (+8 bonus points when verified).
              </p>
              <p className="text-xs text-muted-foreground mt-3 font-medium text-foreground">
                Points earned now (responsible reporting)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                +{result.points.base} filed · +{result.points.severity} severity ({sev}) ·
                {result.points.plastic > 0 ? ` +${result.points.plastic} plastic indicated` : " no plastic bonus"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pin location</DialogTitle>
            <DialogDescription>Click the map to drop coordinates (manual selection).</DialogDescription>
          </DialogHeader>
          <PollutionMapView
            center={[lat, lng]}
            zoom={14}
            markers={[
              {
                id: "pick",
                lat,
                lng,
                severity: "low",
                severityPercent: 10,
                status: "detected",
                source: "citizen",
                label: "Your pin",
              },
            ]}
            height={280}
            userLocation={pinMapUser}
            onLocationPick={(la, ln) => {
              void applyCoordsWithPlaceName(la, ln);
            }}
          />
          <DialogFooter>
            <Button type="button" className="rounded-full" onClick={() => setMapOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cameraOpen} onOpenChange={(o) => !o && stopCamera()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Camera</DialogTitle>
            <DialogDescription>Capture a frame for your report.</DialogDescription>
          </DialogHeader>
          <video ref={videoRef} className="w-full rounded-xl bg-black aspect-video object-cover" playsInline muted />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full" onClick={stopCamera}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={captureFrame}>
              Capture photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
