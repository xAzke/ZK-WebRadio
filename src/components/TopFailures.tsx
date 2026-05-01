import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FailureTrack } from "@/services/api";

interface TopFailuresProps {
    failures: FailureTrack[];
    isLoading?: boolean;
}

export function TopFailures({ failures, isLoading }: TopFailuresProps) {
    if (isLoading) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Top Fallos
                </h3>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 animate-pulse"
                        >
                            <div className="w-12 h-12 bg-secondary rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-secondary rounded w-3/4" />
                                <div className="h-3 bg-secondary rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Top Fallos
            </h3>

            {failures.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                    No hay fallos registrados
                </p>
            ) : (
                <div className="space-y-3">
                    {failures.map((track, index) => (
                        <div
                            key={track.trackId}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-lg transition-all",
                                "hover:bg-secondary/50",
                                "border border-transparent hover:border-destructive/20",
                            )}
                        >
                            <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                                {index + 1}
                            </span>

                            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                                {track.albumCover ? (
                                    <img
                                        src={track.albumCover}
                                        alt={track.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-foreground">
                                    {track.title || `Track ${track.trackId}`}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {track.artist || "Artista desconocido"}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-semibold text-destructive">
                                    {track.failureCount} fallos
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {track.failureRatio.toFixed(1)}% tasa
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
