"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export interface BreakdownRow {
  label: string;
  value: number;
  icon?: string;
}

interface BreakdownCardProps {
  title: string;
  rows: BreakdownRow[];
}

export function BreakdownCard({ title, rows }: BreakdownCardProps) {
  const maxRowValue =
    rows.length > 0 ? Math.max(...rows.map((row) => row.value)) : 0;

  return (
    <Card className="rounded-[2rem] border border-white/5 bg-[#121216]/95 flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-white/20 mb-4 flex items-center justify-between text-[9px] font-bold tracking-wider uppercase">
          <span>Metric</span>
          <span>Volume</span>
        </div>
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  {row.icon && (
                    <img 
                      src={row.icon} 
                      alt="" 
                      className="w-4 h-3 object-cover rounded-[2px] border border-white/5 shrink-0" 
                    />
                  )}
                  <span className="text-white/60 font-medium truncate tracking-tight">{row.label}</span>
                </div>
                <span className="text-primary font-mono font-bold tracking-tighter">{row.value}</span>
              </div>
              <div className="bg-white/5 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40 transition-all duration-1000"
                  style={{ width: `${(row.value / maxRowValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
