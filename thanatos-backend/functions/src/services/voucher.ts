import { isAddress, type Address, type Hex } from "viem";
import { ALIVE_MULT_BPS, ALTAR_ADDRESS, CHAIN, DEAD_MULT_BPS, VOUCHER_TTL_SEC } from "../config/constants";
import { verifierAccount } from "../config/clients";
import { classify, tokenHealth } from "./dexMetrics";

export type VoucherOut = { token: Address; multBps: number; expiry: number; sig: Hex; status: "dead" | "alive" | "unknown" };

/**
 * EIP-712 deadness voucher. Signed by the VERIFIER key (separate from the agent key).
 * Unknown tokens get no voucher: the contract then applies the small, capped unverified karma.
 */
export async function issueVoucher(tokenRaw: string): Promise<VoucherOut | { status: "unknown"; reason: string }> {
  if (!isAddress(tokenRaw)) return { status: "unknown", reason: "bad address" };
  const token = tokenRaw as Address;
  const h = await tokenHealth(token);
  const status = classify(h);
  if (status === "unknown") return { status, reason: "no market history" };

  const multBps = status === "dead" ? DEAD_MULT_BPS : ALIVE_MULT_BPS;
  const expiry = Math.floor(Date.now() / 1000) + VOUCHER_TTL_SEC;
  const sig = await verifierAccount().signTypedData({
    domain: { name: "THANATOS Altar", version: "2", chainId: CHAIN.id, verifyingContract: ALTAR_ADDRESS },
    types: {
      Voucher: [
        { name: "token", type: "address" },
        { name: "multBps", type: "uint16" },
        { name: "expiry", type: "uint64" },
        { name: "chainId", type: "uint256" },
        { name: "altar", type: "address" },
      ],
    },
    primaryType: "Voucher",
    message: { token, multBps, expiry: BigInt(expiry), chainId: BigInt(CHAIN.id), altar: ALTAR_ADDRESS },
  });
  return { token, multBps, expiry, sig, status };
}
