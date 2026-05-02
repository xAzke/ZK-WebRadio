"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  deviceCategoryData,
  usersPerDay,
  usersPerDayChartConfig,
} from "./data";

interface OverviewCardProps {
  totalRequests: number;
  dailyStats?: { day: string, users: number }[];
  hardwareStats?: { name: string, value: number, fill: string }[];
}

export function OverviewCard({ totalRequests, dailyStats = usersPerDay, hardwareStats = deviceCategoryData }: OverviewCardProps) {
  const currentTotal = totalRequests.toLocaleString();
  
  // Create a single data point for the progress bar
  const progressData = [{ name: "Current", value: totalRequests }];

  return (
    <Card className="bg-[#0f0f12]/80 absolute top-6 left-6 z-10 w-64 backdrop-blur-xl border-white/5 rounded-3xl shadow-2xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Users className="w-3 h-3 text-primary" />
          </div>
          <p className="text-white/20 text-[9px] tracking-[0.2em] font-bold uppercase">
            Active Audience
          </p>
        </div>
        <p className="text-3xl leading-none font-mono font-bold text-white/90 tracking-tighter">{currentTotal}</p>
      </CardHeader>

      <CardContent className="pt-2">
        <ChartContainer
          config={usersPerDayChartConfig}
          className="aspect-auto h-2 w-full"
        >
          <BarChart
            layout="vertical"
            data={progressData}
            margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
          >
            <XAxis type="number" hide domain={[0, Math.max(1000, totalRequests)]} />
            <YAxis type="category" dataKey="name" hide />
            <Bar
              dataKey="value"
              fill="var(--color-users)"
              radius={[2, 2, 2, 2]}
              animationDuration={1000}
              // Using a subtle glow for the bar shadow to match the industrial theme
              style={{ filter: "drop-shadow(0 0 4px var(--color-users))" }}
            />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight">
          <TrendingUp className="size-3 text-emerald-500" />
          <span className="text-emerald-500">Live Stream Sync</span>
          <span className="text-white/20 ml-1">v2.4</span>
        </div>
      </CardContent>
    </Card>
  );
}
