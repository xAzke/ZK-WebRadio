import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Play, Pause, Music, Loader2 } from "lucide-react";
import { getCacheFiles, getCachePlayUrl, type CacheFile } from "@/services/api";

interface CacheBrowserProps {
    open: boolean;
    onClose: () => void;
}

export function CacheBrowser({ open, onClose }: CacheBrowserProps) {
    const [files, setFiles] = useState<CacheFile[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

    const fetchFiles = useCallback(async (query?: string) => {
        setLoading(true);
        try {
            const data = await getCacheFiles(query);
            setFiles(data);
        } catch (err) {
            console.error("Error fetching cache files:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchFiles();
            setSearch("");
            setPlayingId(null);
        } else {
            // Cleanup audio on close
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        }
    }, [open, fetchFiles]);

    const handleSearch = (value: string) => {
        setSearch(value);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            fetchFiles(value || undefined);
        }, 400);
    };

    const handlePlay = async (file: CacheFile) => {
        // If already playing this track, pause it
        if (playingId === file.id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        // Clean up previous blob
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        setLoadingAudio(file.id);

        try {
            const blobUrl = await getCachePlayUrl(file.id);
            blobUrlRef.current = blobUrl;

            if (audioRef.current) {
                audioRef.current.pause();
            }

            const audio = new Audio(blobUrl);
            audioRef.current = audio;

            audio.onended = () => setPlayingId(null);
            audio.onerror = () => {
                setPlayingId(null);
                setLoadingAudio(null);
            };

            await audio.play();
            setPlayingId(file.id);
        } catch (err) {
            console.error("Error playing audio:", err);
        } finally {
            setLoadingAudio(null);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">
                            Cache de Audio
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {files.length} archivos en cache
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por título, artista o ID..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Music className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm">
                                No se encontraron archivos
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer hover:bg-secondary/80 ${
                                        playingId === file.id
                                            ? "bg-primary/10 border border-primary/30"
                                            : ""
                                    }`}
                                    onClick={() => handlePlay(file)}
                                >
                                    {/* Cover / Play Button */}
                                    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-secondary">
                                        {file.cover ? (
                                            <img
                                                src={file.cover}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Music className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                            {loadingAudio === file.id ? (
                                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                                            ) : playingId === file.id ? (
                                                <Pause className="w-5 h-5 text-white" />
                                            ) : (
                                                <Play className="w-5 h-5 text-white" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {file.title !== "Unknown"
                                                ? file.title
                                                : `Track ${file.id}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {file.artist !== "Unknown"
                                                ? file.artist
                                                : "Artista desconocido"}
                                        </p>
                                    </div>

                                    {/* Size */}
                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                        {file.sizeMB} MB
                                    </span>

                                    {/* Playing indicator */}
                                    {playingId === file.id && (
                                        <div className="flex items-end gap-0.5 h-4">
                                            <span
                                                className="w-1 bg-primary rounded-full animate-pulse"
                                                style={{
                                                    height: "60%",
                                                    animationDelay: "0ms",
                                                }}
                                            />
                                            <span
                                                className="w-1 bg-primary rounded-full animate-pulse"
                                                style={{
                                                    height: "100%",
                                                    animationDelay: "150ms",
                                                }}
                                            />
                                            <span
                                                className="w-1 bg-primary rounded-full animate-pulse"
                                                style={{
                                                    height: "40%",
                                                    animationDelay: "300ms",
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
