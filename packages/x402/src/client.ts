import { encodePaymentHeader, decodePaymentResponseHeader } from "./codec"
import { X402_HEADER, X402_RESPONSE_HEADER } from "./types"
import type { PaymentPayload, PaymentRequirements, PaymentResponseHeader } from "./types"

export interface X402FetchResult<T> {
  body: T
  payment?: PaymentResponseHeader
  requirements?: PaymentRequirements[]
}

export interface BuildPaymentFn {
  (requirements: PaymentRequirements[]): Promise<PaymentPayload>
}

export type X402ParseMode = "json" | "blob" | "arrayBuffer" | "text"

export interface X402FetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  buildPayment: BuildPaymentFn
  parse?: X402ParseMode
  maxAttempts?: number
  signal?: AbortSignal
}

export async function x402Fetch<T = unknown>(
  url: string,
  options: X402FetchOptions,
): Promise<X402FetchResult<T>> {
  const maxAttempts = options.maxAttempts ?? 2
  let attempt = 0
  let paymentHeader: string | undefined

  while (attempt < maxAttempts) {
    attempt += 1
    const headers: Record<string, string> = { ...(options.headers ?? {}) }
    if (paymentHeader) headers[X402_HEADER] = paymentHeader

    const init: Record<string, unknown> = {
      method: options.method ?? "GET",
      headers,
    }
    if (options.body !== undefined) init.body = options.body
    if (options.signal) init.signal = options.signal

    const response = await fetch(url, init as RequestInit)

    if (response.status === 402) {
      const detail = (await response.json()) as { accepts?: PaymentRequirements[] }
      if (!detail.accepts || detail.accepts.length === 0) {
        throw new Error("server returned 402 without accepts list")
      }
      const payload = await options.buildPayment(detail.accepts)
      paymentHeader = encodePaymentHeader(payload)
      continue
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`x402 fetch failed: ${response.status} ${text}`)
    }

    const settlementHeader = response.headers.get(X402_RESPONSE_HEADER)
    const payment = settlementHeader ? decodePaymentResponseHeader(settlementHeader) : undefined

    const parseMode = options.parse ?? "json"
    let body: T
    if (parseMode === "json") body = (await response.json()) as T
    else if (parseMode === "blob") body = (await response.blob()) as unknown as T
    else if (parseMode === "arrayBuffer") body = (await response.arrayBuffer()) as unknown as T
    else body = (await response.text()) as unknown as T

    return { body, payment }
  }

  throw new Error(`x402 fetch exhausted ${maxAttempts} attempts`)
}
