import { AlertTriangle, ShieldX, RefreshCw, Home, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface AuthErrorProps {
    type: "unauthorized" | "state_mismatch" | "session_error" | "generic";
    message?: string;
}

const errorConfig = {
    unauthorized: {
        icon: ShieldX,
        title: "Acceso Denegado",
        description:
            "Tu cuenta de Discord no tiene permisos para acceder a este panel de administración.",
        variant: "destructive" as const,
    },
    state_mismatch: {
        icon: RefreshCw,
        title: "Sesión Expirada",
        description:
            "Tu sesión de autenticación expiró o fue interrumpida. Por favor, intenta iniciar sesión nuevamente.",
        variant: "default" as const,
    },
    session_error: {
        icon: AlertTriangle,
        title: "Error de Sesión",
        description:
            "No se pudo crear tu sesión. Es posible que tu cuenta no esté autorizada.",
        variant: "destructive" as const,
    },
    generic: {
        icon: AlertTriangle,
        title: "Error de Autenticación",
        description: "Ocurrió un error durante el proceso de autenticación.",
        variant: "default" as const,
    },
};

export function AuthError({ type, message }: AuthErrorProps) {
    const config = errorConfig[type] || errorConfig.generic;
    const Icon = config.icon;

    const handleRetry = () => {
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center pb-2">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                            <Radio className="w-8 h-8 text-primary-foreground" />
                        </div>
                    </div>

                    {/* Error Icon */}
                    <div className="flex justify-center mb-4">
                        <div
                            className={`p-3 rounded-full ${
                                config.variant === "destructive"
                                    ? "bg-destructive/10"
                                    : "bg-muted"
                            }`}
                        >
                            <Icon
                                className={`h-8 w-8 ${
                                    config.variant === "destructive"
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                }`}
                            />
                        </div>
                    </div>

                    <CardTitle className="text-xl">{config.title}</CardTitle>
                    <CardDescription className="mt-2">
                        {message || config.description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Additional info for unauthorized */}
                    {type === "unauthorized" && (
                        <div className="rounded-lg border p-4 bg-muted/50">
                            <p className="text-sm text-muted-foreground">
                                Si crees que deberías tener acceso, contacta al
                                administrador del servidor.
                            </p>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button
                        onClick={handleRetry}
                        className="w-full transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Home className="h-4 w-4 mr-2" />
                        Volver al Inicio
                    </Button>

                    {type === "state_mismatch" && (
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reintentar
                        </Button>
                    )}
                </CardFooter>

                <p className="text-xs text-muted-foreground text-center pb-6">
                    WebRadio Admin Dashboard
                </p>
            </Card>
        </div>
    );
}
