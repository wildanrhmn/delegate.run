import { Hono } from "hono"
import type { Hex } from "viem"
import { verifyOneShotWebhook } from "../webhook-verify"
import { loadEnv } from "../env"
import { logger } from "../log"
import { state } from "../state"

interface RelayerStatusPayload {
  taskId: Hex
  status: string
  chainId?: string
  hash?: Hex
  keyId?: string
  signature?: string
  [key: string]: unknown
}

const TERMINAL_STATUSES = new Set([
  "TransactionExecutionConfirmed",
  "TransactionExecutionRejected",
  "TransactionExecutionReverted",
])

const STATUS_LABEL: Record<string, "Pending" | "Submitted" | "Confirmed" | "Rejected" | "Reverted"> = {
  TransactionExecutionPending: "Pending",
  TransactionExecutionSubmitted: "Submitted",
  TransactionExecutionConfirmed: "Confirmed",
  TransactionExecutionRejected: "Rejected",
  TransactionExecutionReverted: "Reverted",
}

export const webhookRoute = new Hono()

webhookRoute.post("/relay", async (c) => {
  const env = loadEnv()
  const body = (await c.req.json().catch(() => null)) as RelayerStatusPayload | null
  if (!body) return c.text("bad json", 400)

  const verification = await verifyOneShotWebhook(env.ONESHOT_JWKS_URL, body)
  if (!verification.ok) {
    logger.warn({ reason: verification.reason }, "1shot webhook verification failed")
    return c.text("unauthorized", 401)
  }

  const label = STATUS_LABEL[body.status] ?? "Pending"
  const existing = state.getTask(body.taskId)
  if (!existing) {
    logger.warn({ taskId: body.taskId }, "received webhook for unknown task")
  } else {
    state.updateTask(body.taskId, {
      status: label,
      hash: body.hash,
    })
    if (existing.briefId) {
      state.emit({
        briefId: existing.briefId,
        ts: Date.now(),
        kind: TERMINAL_STATUSES.has(body.status)
          ? "broker.relay.confirmed"
          : "broker.relay.submitted",
        specialistKind: (existing.specialistKind ?? undefined) as never,
        details: { taskId: body.taskId, hash: body.hash, status: label },
      })
    }
  }

  return c.json({ ok: true })
})
