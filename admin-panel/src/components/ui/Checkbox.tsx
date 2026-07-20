import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, onCheckedChange, ...props }, ref) => {
        return (
            <input
                type="checkbox"
                className={cn(
                    "h-4 w-4 rounded border-white/10 bg-black/40 text-indigo-500 focus:ring-indigo-500/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer",
                    className
                )}
                onChange={(e) => onCheckedChange?.(e.target.checked)}
                ref={ref}
                {...props}
            />
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
