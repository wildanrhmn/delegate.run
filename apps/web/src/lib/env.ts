import { z } from "zod"

const Schema = z.object({
  NEXT_PUBLIC_BROKER_URL: z.string().url(),
  NEXT_PUBLIC_BROKER_BEARER_TOKEN: z.string().min(8),
  NEXT_PUBLIC_BASE_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_ONESHOT_RELAYER_URL: z.string().url().default("https://relayer.1shotapi.com/relayers"),
  NEXT_PUBLIC_MINT_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  NEXT_PUBLIC_BROKER_FLOAT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export const publicEnv = (() => {
  const parsed = Schema.safeParse({
    NEXT_PUBLIC_BROKER_URL: process.env.NEXT_PUBLIC_BROKER_URL,
    NEXT_PUBLIC_BROKER_BEARER_TOKEN: process.env.NEXT_PUBLIC_BROKER_BEARER_TOKEN,
    NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
    NEXT_PUBLIC_ONESHOT_RELAYER_URL: process.env.NEXT_PUBLIC_ONESHOT_RELAYER_URL,
    NEXT_PUBLIC_MINT_CONTRACT: process.env.NEXT_PUBLIC_MINT_CONTRACT ?? "0x0000000000000000000000000000000000000000",
    NEXT_PUBLIC_BROKER_FLOAT_ADDRESS:
      process.env.NEXT_PUBLIC_BROKER_FLOAT_ADDRESS ?? "0x0000000000000000000000000000000000000000",
  })
  if (!parsed.success) {
    if (typeof window !== "undefined") {
      console.warn("public env partial:", parsed.error.flatten().fieldErrors)
    }
    return {
      NEXT_PUBLIC_BROKER_URL: "",
      NEXT_PUBLIC_BROKER_BEARER_TOKEN: "",
      NEXT_PUBLIC_BASE_RPC_URL: undefined,
      NEXT_PUBLIC_ONESHOT_RELAYER_URL: "https://relayer.1shotapi.com/relayers",
      NEXT_PUBLIC_MINT_CONTRACT: "0x0000000000000000000000000000000000000000" as const,
      NEXT_PUBLIC_BROKER_FLOAT_ADDRESS: "0x0000000000000000000000000000000000000000" as const,
    }
  }
  return parsed.data
})()
