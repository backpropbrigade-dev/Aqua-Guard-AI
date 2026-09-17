import { useState } from "react";
import { BookOpen, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { getFaq, getSupportTickets, submitSupportTicket } from "@/lib/citizen-store";

export default function Help() {
  useCitizenVersion();
  const faqs = getFaq();
  const [contactOpen, setContactOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const tickets = getSupportTickets();

  const sendTicket = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please add a subject and message.");
      return;
    }
    submitSupportTicket(subject.trim(), message.trim());
    setContactOpen(false);
    setSubject("");
    setMessage("");
    toast.success("Ticket submitted (POST /support/ticket)");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Help & support</CardTitle>
          <CardDescription>GET /faq · POST /support/ticket</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              FAQ
            </h3>
            <Accordion type="single" collapsible className="w-full rounded-xl border border-border/60 px-2">
              {faqs.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-left text-foreground hover:no-underline">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Guides</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="font-medium text-foreground">How to use the dashboard</p>
                <p className="text-xs text-muted-foreground mt-1">Overview cards pull from /dashboard-data; use Report Pollution for uploads and the map for hotspots.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="font-medium text-foreground">How reporting works</p>
                <p className="text-xs text-muted-foreground mt-1">Media + GPS → AI severity → drone or NGO routing. Track everything under My Reports.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="rounded-full gap-2" type="button" onClick={() => setContactOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              Contact support
            </Button>
            <Button variant="outline" className="rounded-full gap-2" type="button" asChild>
              <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">
                Map data (OSM)
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          {tickets.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Your recent tickets</p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {tickets.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <span className="text-foreground font-medium">{t.subject}</span> — {new Date(t.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact support</DialogTitle>
            <DialogDescription>Submit a query or issue ticket.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="subj">Subject</Label>
              <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" placeholder="Brief title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg">Message</Label>
              <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-xl min-h-[120px]" placeholder="Describe your issue…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setContactOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={sendTicket}>
              Submit ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
