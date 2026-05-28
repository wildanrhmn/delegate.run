import type { Hex } from "viem"

export function shortAddress(value?: string | null): string {
  if (!value) return "—"
  if (value.length < 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export function shortTx(value?: Hex | string | null): string {
  if (!value) return "—"
  if (value.length < 14) return value
  return `${value.slice(0, 8)}…${value.slice(-6)}`
}

export function formatUsdcAtoms(atoms: bigint | string): string {
  const value = typeof atoms === "string" ? BigInt(atoms) : atoms
  const whole = value / 1_000_000n
  const frac = value % 1_000_000n
  if (frac === 0n) return `${whole.toString()} USDC`
  const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "")
  return `${whole.toString()}.${fracStr} USDC`
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 1500) return "just now"
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}
