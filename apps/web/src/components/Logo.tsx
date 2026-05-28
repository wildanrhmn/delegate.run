import { cn } from "@/lib/cn"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <div className="relative h-6 w-6">
        <div className="absolute inset-0 rounded-md bg-white" />
        <div className="absolute inset-[5px] rounded-[3px] bg-neutral-950" />
        <div className="absolute inset-[7px] rounded-[2px] bg-sig" />
      </div>
      <span className="font-display text-[15px] font-semibold tracking-tight text-white">
        delegate<span className="text-sig">.</span>run
      </span>
    </div>
  )
}
