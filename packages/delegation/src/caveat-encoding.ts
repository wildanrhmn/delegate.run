import { type Address, type Hex, encodeAbiParameters, encodePacked, pad, toHex } from "viem"
import type { Caveat } from "./types"
import { BASE_MAINNET_ENV } from "./addresses"

const ENFORCERS = BASE_MAINNET_ENV.caveatEnforcers

export function caveatAllowedTargets(targets: Address[]): Caveat {
  return {
    enforcer: ENFORCERS.AllowedTargetsEnforcer!,
    terms: encodePacked(
      targets.map(() => "address"),
      targets,
    ),
    args: "0x",
  }
}

export function caveatAllowedMethods(selectors: Hex[]): Caveat {
  return {
    enforcer: ENFORCERS.AllowedMethodsEnforcer!,
    terms: encodePacked(
      selectors.map(() => "bytes4"),
      selectors,
    ),
    args: "0x",
  }
}

export function caveatLimitedCalls(maxCalls: number): Caveat {
  return {
    enforcer: ENFORCERS.LimitedCallsEnforcer!,
    terms: pad(toHex(maxCalls), { size: 32 }),
    args: "0x",
  }
}

export function caveatTimestampWindow(notBefore: number, notAfter: number): Caveat {
  const terms = encodeAbiParameters(
    [{ type: "uint128" }, { type: "uint128" }],
    [BigInt(notBefore), BigInt(notAfter)],
  )
  return {
    enforcer: ENFORCERS.TimestampEnforcer!,
    terms,
    args: "0x",
  }
}

export function caveatErc20PeriodTransfer(args: {
  token: Address
  periodAmountAtoms: bigint
  periodSeconds: number
  startTime: number
}): Caveat {
  const terms = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
    [args.token, args.periodAmountAtoms, BigInt(args.periodSeconds), BigInt(args.startTime)],
  )
  return {
    enforcer: ENFORCERS.ERC20PeriodTransferEnforcer!,
    terms,
    args: "0x",
  }
}

export function buildSpecialistCaveats(args: {
  brokerAddress: Address
  paymentToken: Address
  maxCalls: number
  perCallCapAtoms: bigint
  ttlSeconds: number
}): Caveat[] {
  const now = Math.floor(Date.now() / 1000)
  return [
    caveatAllowedTargets([args.paymentToken]),
    caveatLimitedCalls(args.maxCalls),
    caveatTimestampWindow(now, now + args.ttlSeconds),
    caveatErc20PeriodTransfer({
      token: args.paymentToken,
      periodAmountAtoms: args.perCallCapAtoms,
      periodSeconds: args.ttlSeconds,
      startTime: now,
    }),
  ]
}
