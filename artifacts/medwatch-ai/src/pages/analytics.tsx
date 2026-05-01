import * as React from "react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  useGetTimeseries, 
  useGetDrugsAnalytics, 
  useGetHospitalsAnalytics, 
  useGetDistrictsAnalytics,
  useGetSignalsSummary
} from "@workspace/api-client-react";

const COLORS = {
  primary: "#6366F1",
  secondary: "#22D3EE",
  destructive: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

export default function Analytics() {
  const { data: timeseries, isLoading: loadingTimeseries } = useGetTimeseries();
  const { data: topDrugs, isLoading: loadingDrugs } = useGetDrugsAnalytics();
  const { data: topHospitals, isLoading: loadingHospitals } = useGetHospitalsAnalytics();
  const { data: districts, isLoading: loadingDistricts } = useGetDistrictsAnalytics();
  const { data: summary, isLoading: loadingSummary } = useGetSignalsSummary();

  const categoryData = summary?.by_category ? Object.entries(summary.by_category).map(([name, value]) => ({
    name: name.replace("_", " ").toUpperCase(),
    value
  })) : [];
  
  const categoryColors = [COLORS.primary, COLORS.secondary, COLORS.destructive, COLORS.high];

  const locationData = summary?.by_location_type ? [
    { name: "Urban", value: summary.by_location_type.urban },
    { name: "Rural", value: summary.by_location_type.rural },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deep Analytics</h1>
          <p className="text-muted-foreground">Strategic overview of system-wide trends and risk factors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Signals per hour (Line) */}
        <Card className="glass-card lg:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Signal Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingTimeseries ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                  <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} tickFormatter={(val) => val.split('T')[1].substring(0, 5)} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3E', color: '#F1F5F9' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="critical" stroke={COLORS.destructive} strokeWidth={2} dot={false} name="Critical" />
                  <Line type="monotone" dataKey="high" stroke={COLORS.high} strokeWidth={2} dot={false} name="High" />
                  <Line type="monotone" dataKey="medium" stroke={COLORS.medium} strokeWidth={2} dot={false} name="Medium" />
                  <Line type="monotone" dataKey="low" stroke={COLORS.low} strokeWidth={2} dot={false} name="Low" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Drugs */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Top Suspected Drugs</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingDrugs ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDrugs} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                  <YAxis dataKey="drug_name" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3E', color: '#F1F5F9' }} cursor={{fill: '#2A2D3E'}} />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Hospitals */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Top Reporting Hospitals</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingHospitals ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topHospitals} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                  <YAxis dataKey="hospital_name" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3E', color: '#F1F5F9' }} cursor={{fill: '#2A2D3E'}} />
                  <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 4, 4, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Incident Categories</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingSummary ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3E', color: '#F1F5F9' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Location Type Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Urban vs Rural Reports</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingSummary ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3E', color: '#F1F5F9' }} cursor={{fill: '#2A2D3E'}} />
                  <Bar dataKey="value" name="Signals" radius={[4, 4, 0, 0]}>
                    {locationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.primary : COLORS.secondary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* District Risk Table */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>District Risk Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] overflow-auto">
            {loadingDistricts ? <Skeleton className="h-full w-full" /> : (
              <Table>
                <TableHeader className="bg-card-border/50 sticky top-0">
                  <TableRow className="border-card-border">
                    <TableHead>District</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right text-destructive">Critical</TableHead>
                    <TableHead className="text-right text-high">High</TableHead>
                    <TableHead className="text-right text-medium">Medium</TableHead>
                    <TableHead className="text-right text-low">Low</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districts?.map((d) => (
                    <TableRow key={d.district} className="border-card-border">
                      <TableCell className="font-medium">{d.district}</TableCell>
                      <TableCell className="text-right font-mono">{d.total}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{d.critical}</TableCell>
                      <TableCell className="text-right font-mono text-high">{d.high}</TableCell>
                      <TableCell className="text-right font-mono text-medium">{d.medium}</TableCell>
                      <TableCell className="text-right font-mono text-low">{d.low}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}