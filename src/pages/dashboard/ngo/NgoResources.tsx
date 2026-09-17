import { BookOpen, FileText, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const resources = [
  {
    title: "Field safety protocol",
    desc: "PPE, tides, and incident reporting for shoreline cleanups.",
    icon: FileText,
  },
  {
    title: "Plastic sorting guide",
    desc: "Aligns with AquaGuard AI severity labels for handoff to recyclers.",
    icon: BookOpen,
  },
  {
    title: "Partner liaison",
    desc: "Escalations for drone-routed high-severity events.",
    icon: Phone,
  },
  {
    title: "Quarterly reporting",
    desc: "Template for impact metrics shared with the platform.",
    icon: Mail,
  },
];

export default function NgoResources() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Partner resources</h2>
        <p className="text-sm text-muted-foreground mt-1">Reference materials for your field teams (demo placeholders).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {resources.map((r, i) => (
          <Card
            key={r.title}
            className={cn(
              "border-border/70 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md",
              "animate-in fade-in zoom-in-95",
            )}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <r.icon className="h-5 w-5" />
              </div>
              <CardTitle className="font-heading text-lg pt-2">{r.title}</CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" className="rounded-full" disabled>
                Open (coming soon)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
