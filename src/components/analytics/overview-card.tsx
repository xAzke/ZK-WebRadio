"use client";

import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  usersPerDayChartConfig,
} from "./data";

interface OverviewCardProps {
  totalRequests: number;
}

export function OverviewCard({ totalRequests }: OverviewCardProps) {
  const currentTotal = totalRequests.toLocaleString();
  
  // Create a single data point for the progress bar
  const progressData = [{ name: "Current", value: totalRequests }];

  return (
    <Card className="bg-[#0f0f12]/90 absolute top-6 left-6 z-10 w-56 backdrop-blur-2xl border-white/5 rounded-[2rem] shadow-2xl overflow-hidden border">
      <div className="p-4 space-y-3">
        {/* Header Section */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
              <Users className="w-2.5 h-2.5 text-primary" />
            </div>
            <p className="text-white/20 text-[8px] tracking-[0.2em] font-bold uppercase">
              Active Audience
            </p>
          </div>
          <p className="text-2xl leading-none font-mono font-bold text-white/90 tracking-tighter">{currentTotal}</p>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <ChartContainer
            config={usersPerDayChartConfig}
            className="aspect-auto h-1.5 w-full"
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
                radius={[4, 4, 4, 4]}
                animationDuration={1000}
                style={{ filter: "drop-shadow(0 0 4px var(--color-users))" }}
              />
            </BarChart>
          </ChartContainer>
          
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-2.5 text-emerald-500" />
              <span className="text-emerald-500 text-[8px] font-bold uppercase tracking-tight">Sync Active</span>
            </div>
            <span className="text-white/10 text-[8px] font-mono font-bold">V2.4</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
