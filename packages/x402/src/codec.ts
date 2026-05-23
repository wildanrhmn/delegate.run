import { PaymentPayloadSchema, PaymentResponseHeaderSchema } from "./types"
import type { PaymentPayload, PaymentResponseHeader } from "./types"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64")
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"))
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodePaymentHeader(payload: PaymentPayload): string {
  const json = JSON.stringify(payload)
  return toBase64(encoder.encode(json))
}

export function decodePaymentHeader(header: string): PaymentPayload {
  const bytes = fromBase64(header)
  const json = decoder.decode(bytes)
  const parsed = JSON.parse(json) as unknown
  return PaymentPayloadSchema.parse(parsed)
}

export function encodePaymentResponseHeader(header: PaymentResponseHeader): string {
  const json = JSON.stringify(header)
  return toBase64(encoder.encode(json))
}

export function decodePaymentResponseHeader(value: string): PaymentResponseHeader {
  const bytes = fromBase64(value)
  const json = decoder.decode(bytes)
  const parsed = JSON.parse(json) as unknown
  return PaymentResponseHeaderSchema.parse(parsed)
}
