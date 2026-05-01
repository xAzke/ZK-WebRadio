import * as React from "react";
import { cn } from "@/lib/utils";

function Alert({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    return (
        <div
            role="alert"
            className={cn(
                "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground bg-muted/50",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function AlertDescription({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    return (
        <div
            className={cn(
                "text-sm text-muted-foreground [&_p]:leading-relaxed",
                className,
            )}
            {...props}
        />
    );
}

export { Alert, AlertDescription };
