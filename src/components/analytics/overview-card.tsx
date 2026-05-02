"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart } from "recharts";
import {
  deviceCategoryChartConfig,
  deviceCategoryData,
  usersPerDay,
  usersPerDayChartConfig,
} from "./data";

function MetricChart() {
  return (
    <ChartContainer
      config={usersPerDayChartConfig}
      className="aspect-auto h-8 w-full"
    >
      <AreaChart data={usersPerDay} margin={{ left: 4, right: 4, top: 4 }}>
        <defs>
          <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-users)"
              stopOpacity={0.2}
            />
            <stop
              offset="100%"
              stopColor="var(--color-users)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <Area
          type="natural"
          dataKey="users"
          stroke="var(--color-users)"
          strokeWidth={1.5}
          fill="url(#usersGradient)"
          animationDuration={1500}
        />
      </AreaChart>
    </ChartContainer>
  );
}

interface OverviewCardProps {
  totalRequests: number;
  dailyStats?: { day: string, users: number }[];
  hardwareStats?: { name: string, value: number, fill: string }[];
}

export function OverviewCard({ totalRequests, dailyStats = usersPerDay, hardwareStats = deviceCategoryData }: OverviewCardProps) {
  const currentTotal = totalRequests.toLocaleString();
  
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
          className="aspect-auto h-8 w-full"
        >
          <AreaChart data={dailyStats} margin={{ left: 4, right: 4, top: 4 }}>
            <defs>
              <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-users)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-users)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <Area
              type="natural"
              dataKey="users"
              stroke="var(--color-users)"
              strokeWidth={1.5}
              fill="url(#usersGradient)"
              animationDuration={1500}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight">
          <TrendingUp className="size-3 text-emerald-500" />
          <span className="text-emerald-500">Live Stream Sync</span>
          <span className="text-white/20 ml-1">v2.4</span>
        </div>

        <div className="border-white/5 mt-6 border-t pt-6">
          <p className="text-white/20 text-[9px] tracking-[0.2em] font-bold uppercase mb-4">
            Hardware Distribution
          </p>

          <ChartContainer
            config={deviceCategoryChartConfig}
            className="mx-auto aspect-square h-28 w-28"
          >
            <PieChart>
              <Pie
                data={hardwareStats}
                dataKey="value"
                nameKey="name"
                innerRadius={30}
                outerRadius={45}
                strokeWidth={2}
                stroke="#0f0f12"
              >
                {hardwareStats.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {hardwareStats.map((device) => (
              <div key={device.name} className="text-center">
                <p className="text-white/30 flex items-center justify-center gap-1.5 text-[8px] font-bold tracking-wide uppercase">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: device.fill }}
                  />
                  {device.name.substring(0, 7)}
                </p>
                <p className="text-white/70 mt-1 leading-none font-mono font-bold text-[10px] tabular-nums">
                  {device.value}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
