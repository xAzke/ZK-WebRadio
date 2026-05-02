"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { TrendingUp, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import {
  usersPerDayChartConfig,
} from "./data";

interface OverviewCardProps {
  totalRequests: number;
}

export function OverviewCard({ totalRequests }: OverviewCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentTotal = totalRequests.toLocaleString();
  
  // Create a single data point for the progress bar
  const progressData = [{ name: "Current", value: totalRequests }];

  return (
    <Card className={cn(
      "absolute top-4 left-4 sm:top-6 sm:left-6 z-20 w-48 sm:w-56 transition-all duration-300 overflow-hidden border border-white/5 rounded-3xl sm:rounded-[2rem] shadow-2xl",
      "bg-[#0f0f12] sm:bg-[#0f0f12]/90 sm:backdrop-blur-2xl",
      isCollapsed ? "h-16 sm:h-16" : "h-auto"
    )}>
      <div className="p-3 sm:p-4 space-y-3 h-full flex flex-col justify-center">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <Users className="w-2.5 h-2.5 text-primary" />
              </div>
              <p className="text-white/20 text-[8px] tracking-[0.2em] font-bold uppercase truncate">
                Audience
              </p>
            </div>
            {isCollapsed && (
               <p className="text-xl leading-none font-mono font-bold text-white/90 tracking-tighter truncate">{currentTotal}</p>
            )}
          </div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-10 h-10 -mr-1 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all md:hidden shrink-0 border border-white/5"
            aria-label={isCollapsed ? "Expand analytics" : "Collapse analytics"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronUp className="w-4 h-4 text-white/40" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-2xl leading-none font-mono font-bold text-white/90 tracking-tighter">{currentTotal}</p>
            
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
        )}
      </div>
    </Card>
  );
}
