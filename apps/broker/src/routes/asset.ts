import { Hono } from "hono"
import { assetExists, readAsset } from "../asset-store"

export const assetRoute = new Hono()

assetRoute.get("/:filename{[A-Za-z0-9._-]+}", async (c) => {
  const filename = c.req.param("filename")
  if (!(await assetExists(filename))) return c.text("not found", 404)
  const { data, contentType } = await readAsset(filename)
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": data.byteLength.toString(),
    },
  })
})
