import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-muted inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]", className)}
      role="tablist"
      {...props}
    />
  );
}

function TabsTrigger({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex h-[calc(100%-1px)] min-h-9 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="tabpanel" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
