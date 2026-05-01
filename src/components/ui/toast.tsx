import {
    useState,
    useEffect,
    createContext,
    useContext,
    useCallback,
} from "react";
import { X, CheckCircle, AlertCircle, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Toast types
type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    copyText?: string;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...toast, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({
    toasts,
    removeToast,
}: {
    toasts: Toast[];
    removeToast: (id: string) => void;
}) {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-md">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const timer = setTimeout(onClose, toast.copyText ? 15000 : 5000);
        return () => clearTimeout(timer);
    }, [onClose, toast.copyText]);

    const handleCopy = async () => {
        if (toast.copyText) {
            await navigator.clipboard.writeText(toast.copyText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <AlertCircle className="w-5 h-5 text-blue-500" />,
    };

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300",
                "bg-card border-border",
            )}
        >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{toast.title}</p>
                {toast.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                        {toast.description}
                    </p>
                )}
                {toast.copyText && (
                    <div className="mt-3 flex items-center gap-2">
                        <code className="flex-1 text-xs bg-secondary p-2 rounded font-mono overflow-auto max-h-20 text-foreground">
                            {toast.copyText}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            title="Copiar"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                )}
            </div>
            <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Confirm Dialog
interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "default",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />
            <div className="relative bg-card border border-border rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-foreground">
                    {title}
                </h3>
                <p className="text-muted-foreground mt-2">{description}</p>
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            variant === "destructive"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-primary text-primary-foreground hover:opacity-90",
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
