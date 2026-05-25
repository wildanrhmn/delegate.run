import { Hono } from "hono"

export const healthRoute = new Hono()

healthRoute.get("/", (c) =>
  c.json({
    service: "delegate-run-broker",
    status: "ok",
    ts: Date.now(),
  }),
)
