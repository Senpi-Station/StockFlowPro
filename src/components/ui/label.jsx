import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}