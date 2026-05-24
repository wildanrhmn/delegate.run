import { type Address, type Hex, encodeFunctionData, parseAbi } from "viem"
import type { Delegation, DelegationChain, ExecutionItem } from "./types"
import { encodeRedeemDelegationsCall } from "./encode"

export interface BuildRedemptionTxArgs {
  delegationManager: Address
  chain: DelegationChain
  executions: ExecutionItem[]
}

export interface BuildRedemptionTxResult {
  to: Address
  data: Hex
  value: bigint
}

export function buildRedemptionTx(args: BuildRedemptionTxArgs): BuildRedemptionTxResult {
  const data = encodeRedeemDelegationsCall({ chains: [args.chain], executions: [args.executions] })
  return { to: args.delegationManager, data, value: 0n }
}

const ERC20_ABI = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"])

export function encodeErc20Transfer(args: { to: Address; amount: bigint }): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [args.to, args.amount],
  })
}

export interface BuildPullPaymentExecutionsArgs {
  asset: Address
  payTo: Address
  amount: bigint
}

export function buildPullPaymentExecutions(
  args: BuildPullPaymentExecutionsArgs,
): ExecutionItem[] {
  return [
    {
      target: args.asset,
      value: 0n,
      callData: encodeErc20Transfer({ to: args.payTo, amount: args.amount }),
    },
  ]
}

export function buildPullPaymentRedemption(args: {
  delegationManager: Address
  chain: DelegationChain
  asset: Address
  payTo: Address
  amount: bigint
}): BuildRedemptionTxResult {
  return buildRedemptionTx({
    delegationManager: args.delegationManager,
    chain: args.chain,
    executions: buildPullPaymentExecutions({ asset: args.asset, payTo: args.payTo, amount: args.amount }),
  })
}

export type { Delegation, DelegationChain, ExecutionItem }
