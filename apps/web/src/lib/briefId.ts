import { keccak256, toHex, type Hex } from "viem"

export function generateBriefId(input: { operator: string; prompt: string; nonce?: number }): Hex {
  const nonce = input.nonce ?? Date.now()
  const seed = `${input.operator.toLowerCase()}|${input.prompt}|${nonce}`
  return keccak256(toHex(seed))
}
