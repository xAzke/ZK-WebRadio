import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    iconColor?: string;
    trend?: { value: number; label: string };
    action?: { label: string; onClick: () => void };
    secondaryAction?: { label: string; onClick: () => void };
    className?: string;
}

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor = "text-primary",
    trend,
    action,
    secondaryAction,
    className,
}: StatsCardProps) {
    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/5 bg-[#121216]/95 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-[#16161c] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]",
                className,
            )}
        >
            {/* Background Glow Effect - Replaced expensive blur with radial gradient */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_70%)] transition-transform duration-500 group-hover:scale-150" />
            
            {/* Corner Accent */}
            <div className="absolute right-0 top-0 h-8 w-8 overflow-hidden">
              <div className="absolute right-[-15px] top-[-15px] h-10 w-10 rotate-45 bg-white/5 transition-colors group-hover:bg-primary/20" />
            </div>

            <div className="relative flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-mono font-bold tracking-tighter text-white/90 group-hover:text-white transition-colors">
                            {value}
                        </p>
                    </div>
                    
                    {subtitle && (
                        <p className="text-xs font-medium text-white/40">
                            {subtitle}
                        </p>
                    )}

                    {trend && (
                        <div className="flex items-center pt-2">
                            <span
                                className={cn(
                                    "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-tighter",
                                    trend.value >= 0
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-red-500/10 text-red-400 border border-red-500/20",
                                )}
                            >
                                {trend.value >= 0 ? "↑" : "↓"}
                                {Math.abs(trend.value)}%
                            </span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-3">
                        {action && (
                            <button
                                onClick={action.onClick}
                                className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1 group/btn"
                            >
                                <span className="w-1 h-1 rounded-full bg-red-400/40 group-hover/btn:bg-red-400" />
                                {action.label}
                            </button>
                        )}
                        {secondaryAction && (
                            <button
                                onClick={secondaryAction.onClick}
                                className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 hover:text-primary transition-colors flex items-center gap-1 group/btn"
                            >
                                <span className="w-1 h-1 rounded-full bg-primary/40 group-hover/btn:bg-primary" />
                                {secondaryAction.label}
                            </button>
                        )}
                    </div>
                </div>

                <div className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/5 transition-all duration-500 group-hover:scale-105 group-hover:border-primary/20 group-hover:bg-primary/5",
                    iconColor
                )}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
            
            {/* Bottom Tech Detail */}
            <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent transition-all duration-700 group-hover:w-full" />
        </div>
    );
}
