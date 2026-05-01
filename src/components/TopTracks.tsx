import { ExternalLink, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track } from "@/services/api";

interface TopTracksProps {
    tracks: Track[];
    isLoading?: boolean;
}

export function TopTracks({ tracks, isLoading }: TopTracksProps) {
    const openInDeezer = (track: Track) => {
        const trackId = track.trackId.replace("deezer:", "");
        window.open(`https://www.deezer.com/track/${trackId}`, "_blank");
    };

    if (isLoading) {
        return (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Top Canciones
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
                <Music className="w-5 h-5 text-primary" />
                Top Canciones
            </h3>

            {tracks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                    No hay canciones reproducidas aún
                </p>
            ) : (
                <div className="space-y-3">
                    {tracks.map((track, index) => (
                        <div
                            key={track.trackId}
                            onClick={() => openInDeezer(track)}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-lg transition-all cursor-pointer",
                                "hover:bg-secondary/50 hover:scale-[1.02]",
                            )}
                        >
                            <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                                {index + 1}
                            </span>

                            <div
                                className={cn(
                                    "w-12 h-12 rounded-lg flex items-center justify-center transition-all",
                                    "bg-secondary",
                                    "group-hover:bg-primary",
                                )}
                            >
                                {track.albumCover ? (
                                    <img
                                        src={track.albumCover}
                                        alt={track.title}
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <ExternalLink className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-foreground">
                                    {track.title ||
                                        `Track ${track.trackId.replace("deezer:", "")}`}
                                    {(!track.title ||
                                        track.title === "Unknown") &&
                                        " 🔗"}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {track.artist || "Artista desconocido"}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-semibold text-primary">
                                    {track.playCount}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    plays
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
