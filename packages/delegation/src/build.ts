import type { Address } from "viem"
import type { Delegation } from "./types"
import type { RootBudgetSpec, SpecialistScopeSpec } from "./caveats"

export interface SmartAccountLike {
  address: Address
  environment: unknown
  signDelegation: (args: { delegation: unknown }) => Promise<`0x${string}`>
}

export interface BuildRootDelegationArgs {
  delegator: SmartAccountLike
  delegate: Address
  spec: RootBudgetSpec
}

export interface BuildSpecialistRedelegationArgs {
  delegator: SmartAccountLike
  delegate: Address
  parent: Delegation
  spec: SpecialistScopeSpec
}

export type CreateDelegationFn = (args: {
  scope: unknown
  to: Address
  from: Address
  parentDelegation?: Delegation | undefined
  environment: unknown
  caveats?: unknown[]
}) => Delegation

export async function buildRootDelegation(
  args: BuildRootDelegationArgs,
  createDelegation: CreateDelegationFn,
): Promise<Delegation> {
  const delegation = createDelegation({
    scope: {
      type: "multiTokenPeriod",
      tokens: [
        {
          address: args.spec.brokerAddress,
          periodAmount: args.spec.perDayUsdc,
          periodSeconds: 86400,
          startTimestamp: args.spec.startTimestamp,
        },
      ],
    },
    to: args.delegate,
    from: args.delegator.address,
    environment: args.delegator.environment,
  })

  const signature = await args.delegator.signDelegation({ delegation })
  return { ...delegation, signature }
}

export async function buildSpecialistRedelegation(
  args: BuildSpecialistRedelegationArgs,
  createDelegation: CreateDelegationFn,
): Promise<Delegation> {
  const delegation = createDelegation({
    scope: {
      type: "erc20PeriodTransfer",
      tokenAddress: args.spec.brokerAddress,
      periodAmount: args.spec.perCallCapUsdc,
      periodSeconds: 60,
      startTimestamp: Math.floor(Date.now() / 1000),
    },
    to: args.delegate,
    from: args.delegator.address,
    parentDelegation: args.parent,
    environment: args.delegator.environment,
    caveats: [
      { kind: "allowedTargets", targets: [args.spec.brokerAddress] },
      { kind: "limitedCalls", maxCalls: args.spec.maxCalls },
      { kind: "timestamp", notBefore: 0, notAfter: args.spec.notAfter },
    ],
  })

  const signature = await args.delegator.signDelegation({ delegation })
  return { ...delegation, signature }
}
