"use client"
import { cn } from "@/lib/cn"
import { shortTx } from "@/lib/format"

export interface MintCardProps {
  videoBlobUrl?: string
  totalSpendUsdc: string
  txHash?: string
  isMinting: boolean
  minted: boolean
  onMint: () => void
}

export function MintCard({ videoBlobUrl, totalSpendUsdc, txHash, isMinting, minted, onMint }: MintCardProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-white/5 px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold">final asset</span>
          <span className="pill">{totalSpendUsdc} USDC spent</span>
        </div>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-[3fr_2fr]">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/8 bg-black">
          {videoBlobUrl ? (
            <video src={videoBlobUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline controls />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-neutral-500">
              <div className="flex flex-col items-center gap-3">
                <div className="shimmer h-2 w-32 rounded-full" />
                <span>compositing…</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between">
          <div className="space-y-2 text-sm text-neutral-300">
            <p className="text-balance">
              The final video is composed from five Venice endpoints, paid via three redelegations,
              relayed by 1Shot in USDC. Mint it to claim provenance of every settlement.
            </p>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 font-mono text-[11px] text-neutral-400">
              {txHash ? (
                <>
                  mint tx:{" "}
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 hover:underline"
                  >
                    {shortTx(txHash)}
                  </a>
                </>
              ) : (
                <span className="text-neutral-500">not yet minted</span>
              )}
            </div>
          </div>
          <button
            className={cn("btn-primary mt-4", minted && "pointer-events-none opacity-70")}
            onClick={onMint}
            disabled={isMinting || !videoBlobUrl}
          >
            {minted ? "minted ✓" : isMinting ? "minting…" : "mint to operator wallet"}
          </button>
        </div>
      </div>
    </div>
  )
}
