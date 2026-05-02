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
    variant?: "default" | "technical";
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
    variant = "default",
}: StatsCardProps) {
    const isTechnical = variant === "technical";

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-xl border border-white/5 bg-[#121216]/95 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-[#16161c] flex flex-col justify-between min-h-[120px]",
                className,
            )}
        >
            <div className="relative flex items-start justify-between">
                <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/20 group-hover:text-white/40 transition-colors truncate">
                        {title}
                    </p>
                    <p className={cn(
                        "font-mono font-bold tracking-tighter text-white/90 group-hover:text-white transition-all",
                        isTechnical ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
                    )}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-[10px] font-medium text-white/30 truncate">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/5 transition-all group-hover:border-primary/20 group-hover:bg-primary/5",
                    iconColor
                )}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>

            <div className="relative mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/[0.03]">
                {action && (
                    <button
                        onClick={action.onClick}
                        className="text-[9px] font-bold uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors"
                    >
                        {action.label}
                    </button>
                )}
                {secondaryAction && (
                    <button
                        onClick={secondaryAction.onClick}
                        className="text-[9px] font-bold uppercase tracking-wider text-primary/60 hover:text-primary transition-colors"
                    >
                        {secondaryAction.label}
                    </button>
                )}
                {!action && !secondaryAction && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                        <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Active Relay</span>
                    </div>
                )}
            </div>
        </div>
    );
}
