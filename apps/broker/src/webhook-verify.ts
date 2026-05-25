import * as ed from "@noble/ed25519"
import { logger } from "./log"

interface JwksKey {
  kid: string
  kty: string
  crv: string
  x: string
}

interface JwksDoc {
  keys: JwksKey[]
}

let cache: { keys: Map<string, Uint8Array>; fetchedAt: number } | undefined
const CACHE_TTL_MS = 60 * 60 * 1000

function decodeBase64Url(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4))
  const b64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/")
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"))
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"))
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function refreshJwks(jwksUrl: string): Promise<Map<string, Uint8Array>> {
  const res = await fetch(jwksUrl)
  if (!res.ok) throw new Error(`jwks fetch failed: ${res.status}`)
  const doc = (await res.json()) as JwksDoc
  const keys = new Map<string, Uint8Array>()
  for (const k of doc.keys) {
    if (k.kty === "OKP" && k.crv === "Ed25519") {
      keys.set(k.kid, decodeBase64Url(k.x))
    }
  }
  cache = { keys, fetchedAt: Date.now() }
  logger.info({ count: keys.size }, "refreshed 1shot jwks")
  return keys
}

async function getKey(jwksUrl: string, kid: string): Promise<Uint8Array | undefined> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    const hit = cache.keys.get(kid)
    if (hit) return hit
  }
  const keys = await refreshJwks(jwksUrl)
  return keys.get(kid)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const keys = Object.keys(value as Record<string, unknown>).sort()
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
  return `{${parts.join(",")}}`
}

export interface WebhookEnvelope {
  keyId?: string
  signature?: string
  [key: string]: unknown
}

export interface VerifyWebhookResult {
  ok: boolean
  reason?: string
}

export async function verifyOneShotWebhook(
  jwksUrl: string,
  body: WebhookEnvelope,
): Promise<VerifyWebhookResult> {
  if (!body.signature) return { ok: false, reason: "missing signature field" }
  if (!body.keyId) return { ok: false, reason: "missing keyId field" }

  const key = await getKey(jwksUrl, body.keyId)
  if (!key) return { ok: false, reason: `unknown kid ${body.keyId}` }

  const { signature, ...rest } = body
  const sigBytes = decodeBase64(signature)
  const message = new TextEncoder().encode(stableStringify(rest))

  try {
    const valid = await ed.verifyAsync(sigBytes, message, key)
    return valid ? { ok: true } : { ok: false, reason: "ed25519 verify returned false" }
  } catch (err) {
    return { ok: false, reason: (err as Error).message }
  }
}
