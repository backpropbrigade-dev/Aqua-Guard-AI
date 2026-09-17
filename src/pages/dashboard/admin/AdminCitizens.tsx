import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import { getCitizenAggregate } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
};

export default function AdminCitizens() {
  useAdminDashboardVersion();
  const { users, totalUsers, totalReports, severity, ngoPartner } = getCitizenAggregate();

  const chartData = users.slice(0, 12).map((u) => ({
    name: u.displayLabel.length > 14 ? `${u.displayLabel.slice(0, 12)}…` : u.displayLabel,
    reports: u.reportsCount,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div>
        <h2 className="font-heading text-2xl font-bold">Citizens analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Each row is a stored citizen bundle (local demo). Switch citizen accounts via login to populate multiple rows.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accounts</CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total reports</CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums">{totalReports}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High severity (all users)</CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums text-red-600">{severity.high}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>NGO pending (reports)</CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums text-sky-600">{ngoPartner.pending}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Reports per user (top 12)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="reports" fill="hsl(var(--primary))" name="Reports" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">User bundles</CardTitle>
          <CardDescription>Points and NGO response flags per stored profile</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-center">Low / Med / High</TableHead>
                <TableHead className="text-center">NGO P / A / D</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No citizen data in localStorage. Log in as a citizen and submit a report.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.storageKey}>
                    <TableCell className="font-medium max-w-[200px] truncate">{u.displayLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.reportsCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.points}</TableCell>
                    <TableCell className="text-center text-xs tabular-nums">
                      <Badge variant="outline" className="mr-1 rounded-md">
                        {u.bySeverity.low}
                      </Badge>
                      <Badge variant="outline" className="mr-1 rounded-md">
                        {u.bySeverity.medium}
                      </Badge>
                      <Badge variant="outline" className="rounded-md border-red-500/40">
                        {u.bySeverity.high}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <span className={cn(u.ngoPending > 0 && "text-sky-600 font-medium")}>{u.ngoPending}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-emerald-600">{u.ngoAccepted}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span>{u.ngoDeclined}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
