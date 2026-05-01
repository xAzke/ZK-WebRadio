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
                "rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
                className,
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">
                        {title}
                    </p>
                    <p className="text-3xl font-bold mt-2 text-foreground">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <div className="flex items-center mt-2">
                            <span
                                className={cn(
                                    "text-xs font-medium",
                                    trend.value >= 0
                                        ? "text-green-500"
                                        : "text-destructive",
                                )}
                            >
                                {trend.value >= 0 ? "+" : ""}
                                {trend.value}%
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                                {trend.label}
                            </span>
                        </div>
                    )}
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="text-xs font-medium text-destructive hover:text-destructive/80 mt-2 underline underline-offset-2 transition-colors"
                        >
                            {action.label}
                        </button>
                    )}
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="text-xs font-medium text-primary hover:text-primary/80 mt-2 underline underline-offset-2 transition-colors"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
                <div className={cn("p-3 rounded-lg bg-secondary", iconColor)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
