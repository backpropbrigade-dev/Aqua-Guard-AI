import { Award, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { getRewards } from "@/lib/citizen-store";

export default function Rewards() {
  useCitizenVersion();
  const data = getRewards();
  const nextBadge = data.badges.find((b) => !b.earned);
  const progressToNext = nextBadge
    ? Math.min(100, (data.points / Math.max(data.points + 200, 1)) * 100)
    : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className={cn("overflow-hidden surface-pro shadow-lg ring-1 ring-primary/10")}>
        <div className="bg-gradient-to-r from-primary/12 via-primary/8 to-secondary/15 px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/90 shadow-md border border-border/50">
              <Star className="h-7 w-7 text-secondary fill-secondary/25" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total points (GET /rewards)</p>
              <p className="font-heading text-4xl font-bold text-foreground">{data.points}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
            <div className="rounded-xl bg-background/60 border border-border/40 px-4 py-3">
              <p className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Contributions
              </p>
              <p className="text-lg font-semibold text-foreground mt-0.5">{data.totalContributions}</p>
            </div>
            <div className="rounded-xl bg-background/60 border border-border/40 px-4 py-3">
              <p className="text-muted-foreground">Rank in your area</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">Top {100 - data.rankPercentile}%</p>
            </div>
          </div>
          {nextBadge && (
            <>
              <p className="text-sm text-muted-foreground mt-4">
                Next badge: <span className="text-foreground font-medium">{nextBadge.emoji} {nextBadge.name}</span>
              </p>
              <Progress value={progressToNext} className="h-2 mt-3 rounded-full" />
            </>
          )}
        </div>
        <CardHeader>
          <CardTitle className="font-heading">Badges</CardTitle>
          <CardDescription>+10 report · +20 valid detection · +50 cleanup triggered</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.badges.map((b) => (
            <div
              key={b.id}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${b.earned ? "border-secondary/40 bg-secondary/5" : "border-border/60 opacity-80"}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0" aria-hidden>
                  {b.emoji}
                </span>
                <Award className={`h-8 w-8 shrink-0 ${b.earned ? "text-secondary" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
              </div>
              {b.earned ? (
                <Badge className="rounded-full bg-secondary text-secondary-foreground shrink-0">Earned</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full shrink-0">
                  Locked
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="surface-pro shadow-md">
        <CardHeader>
          <CardTitle className="font-heading">Leaderboard</CardTitle>
          <CardDescription>Top contributors (demo data merged with your score)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leaderboard.map((row) => (
                <TableRow key={`${row.rank}-${row.name}`} className={row.isYou ? "bg-primary/5" : undefined}>
                  <TableCell className="font-medium">{row.rank}</TableCell>
                  <TableCell>
                    {row.name}
                    {row.isYou && (
                      <Badge variant="secondary" className="ml-2 rounded-full text-[10px]">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="surface-pro shadow-md">
        <CardHeader>
          <CardTitle className="font-heading">Points history</CardTitle>
          <CardDescription>Recent awards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.pointsLog.length === 0 ? (
            <p className="text-muted-foreground">No history yet.</p>
          ) : (
            data.pointsLog.slice(0, 12).map((e, i) => (
              <div key={i} className="flex justify-between gap-4 rounded-lg border border-border/50 px-3 py-2">
                <span className="text-muted-foreground">{e.reason}</span>
                <span className="font-medium text-primary tabular-nums">+{e.delta}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
