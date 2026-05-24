import type { Address, Hex } from "viem"

export interface Caveat {
  enforcer: Address
  terms: Hex
  args: Hex
}

export interface Delegation {
  delegate: Address
  delegator: Address
  authority: Hex
  caveats: Caveat[]
  salt: bigint
  signature: Hex
}

export type DelegationChain = Delegation[]

export type CaveatBuilder = () => Caveat

export interface RedeemableChain {
  signedChain: DelegationChain
  redeemer: Address
  executions: ExecutionItem[]
}

export interface ExecutionItem {
  target: Address
  value: bigint
  callData: Hex
}
