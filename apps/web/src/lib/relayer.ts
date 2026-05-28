import type { Address, Hex } from "viem"
import { publicEnv } from "./env"

interface CapabilitiesResult {
  feeCollector: Address
  targetAddress: Address
  tokens: { address: Address; symbol: string; decimals: string }[]
}

export class RelayerClient {
  private readonly endpoint: string
  private nextId = 1

  constructor(endpoint?: string) {
    this.endpoint = endpoint ?? publicEnv.NEXT_PUBLIC_ONESHOT_RELAYER_URL
  }

  async getCapabilities(chainIds: number[]): Promise<Record<string, CapabilitiesResult>> {
    return this.rpc<Record<string, CapabilitiesResult>>(
      "relayer_getCapabilities",
      chainIds.map(String),
    )
  }

  async getStatus(taskId: Hex): Promise<{
    code: 100 | 110 | 200 | 400 | 500
    label: string
    hash?: Hex
    receipt?: unknown
    message?: string | null
  }> {
    return this.rpc("relayer_getStatus", [{ id: taskId, logs: false }])
  }

  private async rpc<T>(method: string, params: unknown): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: this.nextId++, method, params }),
    })
    const body = await res.json()
    if (body.error) throw new Error(`${method} rpc error: ${body.error.message}`)
    return body.result as T
  }
}
