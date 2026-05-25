import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import type { Hex } from "viem"
import { state } from "../state"

export const streamRoute = new Hono()

streamRoute.get("/brief/:briefId", (c) => {
  const briefId = c.req.param("briefId") as Hex

  return streamSSE(c, async (stream) => {
    let closed = false
    const unsubscribe = state.subscribe(briefId, (event) => {
      if (closed) return
      void stream.writeSSE({
        event: event.kind,
        data: JSON.stringify(event),
      })
    })

    for (const past of state.getHistory(briefId)) {
      await stream.writeSSE({ event: past.kind, data: JSON.stringify(past) })
    }

    await stream.writeSSE({ event: "heartbeat", data: JSON.stringify({ ts: Date.now() }) })

    const heartbeat = setInterval(() => {
      void stream.writeSSE({ event: "heartbeat", data: JSON.stringify({ ts: Date.now() }) })
    }, 15000)

    stream.onAbort(() => {
      closed = true
      clearInterval(heartbeat)
      unsubscribe()
    })

    await new Promise<void>((resolve) => {
      stream.onAbort(resolve)
    })
  })
})
