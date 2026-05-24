import {
  type Address,
  type Hex,
  encodeAbiParameters,
  encodeFunctionData,
  parseAbi,
} from "viem"
import type { Delegation, DelegationChain, ExecutionItem } from "./types"

const DELEGATION_TUPLE_TYPE = {
  type: "tuple",
  components: [
    { name: "delegate", type: "address" },
    { name: "delegator", type: "address" },
    { name: "authority", type: "bytes32" },
    {
      name: "caveats",
      type: "tuple[]",
      components: [
        { name: "enforcer", type: "address" },
        { name: "terms", type: "bytes" },
        { name: "args", type: "bytes" },
      ],
    },
    { name: "salt", type: "uint256" },
    { name: "signature", type: "bytes" },
  ],
} as const

const DELEGATION_MANAGER_ABI = parseAbi([
  "function redeemDelegations(bytes[] permissionContexts, bytes32[] modes, bytes[] executionCallDatas)",
])

export const EXECUTION_MODE_SINGLE_DEFAULT: Hex =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

export const EXECUTION_MODE_BATCH_DEFAULT: Hex =
  "0x0100000000000000000000000000000000000000000000000000000000000000"

export function encodeDelegationChain(chain: DelegationChain): Hex {
  return encodeAbiParameters([{ type: "tuple[]", components: DELEGATION_TUPLE_TYPE.components }], [
    chain.map(serializeDelegation),
  ])
}

function serializeDelegation(d: Delegation) {
  return {
    delegate: d.delegate,
    delegator: d.delegator,
    authority: d.authority,
    caveats: d.caveats.map((c) => ({ enforcer: c.enforcer, terms: c.terms, args: c.args })),
    salt: d.salt,
    signature: d.signature,
  }
}

export function encodeSingleExecution(execution: ExecutionItem): Hex {
  return encodeAbiParameters(
    [
      { type: "address", name: "target" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "callData" },
    ],
    [execution.target, execution.value, execution.callData],
  )
}

export function encodeBatchExecution(executions: ExecutionItem[]): Hex {
  return encodeAbiParameters(
    [
      {
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "value", type: "uint256" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    [executions],
  )
}

export interface RedeemDelegationsArgs {
  chains: DelegationChain[]
  executions: ExecutionItem[][]
}

export function encodeRedeemDelegationsCall(args: RedeemDelegationsArgs): Hex {
  if (args.chains.length !== args.executions.length) {
    throw new Error("chains and executions length mismatch")
  }
  const permissionContexts = args.chains.map(encodeDelegationChain)
  const modes = args.executions.map((items) =>
    items.length === 1 ? EXECUTION_MODE_SINGLE_DEFAULT : EXECUTION_MODE_BATCH_DEFAULT,
  )
  const executionCallDatas = args.executions.map((items) =>
    items.length === 1 ? encodeSingleExecution(items[0]!) : encodeBatchExecution(items),
  )
  return encodeFunctionData({
    abi: DELEGATION_MANAGER_ABI,
    functionName: "redeemDelegations",
    args: [permissionContexts, modes, executionCallDatas],
  })
}

export function deriveDelegationHash(_d: Delegation): Hex {
  return "0x0000000000000000000000000000000000000000000000000000000000000000"
}

export type { Address }
