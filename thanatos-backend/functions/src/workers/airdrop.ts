import { createPublicClient, createWalletClient, erc20Abi, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN, EPOCH_DURATION_SEC, FEE_SPLITTER_ADDRESS, feeSplitterAbi, TARGET_GROWTH } from "../config/constants";
import { altarRef, db } from "../config/firebase";
import { tier } from "../utils/math";

const publicClient = createPublicClient({ chain: CHAIN, transport: http() });
const wallet = () => createWalletClient({ account: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`), chain: CHAIN, transport: http() });

export async function runAirdropAndReset(epoch: number, tokenAddress: string) {
  const top = await db.collection("leaderboard").orderBy("epoch_karma", "desc").limit(50).get();
  const recipients = top.docs.map((d) => ({ wallet: d.id as Address, karma: d.data().epoch_karma as number }));
  const totalKarma = recipients.reduce((a, r) => a + r.karma, 0);

  let sent = 0;
  if (tokenAddress && totalKarma > 0) {
    const agent = wallet().account.address;
    const bal = await publicClient.readContract({ address: tokenAddress as Address, abi: erc20Abi, functionName: "balanceOf", args: [agent] }).catch(() => 0n);
    // ponytail: sequential transfers, ~50 txs; batch via a disperse contract if gas becomes an issue
    for (const r of recipients) {
      const amt = (bal * BigInt(Math.floor(r.karma * 1e6))) / BigInt(Math.floor(totalKarma * 1e6));
      if (amt === 0n) continue;
      try {
        await wallet().writeContract({ address: tokenAddress as Address, abi: erc20Abi, functionName: "transfer", args: [r.wallet, amt] });
        sent++;
      } catch (e) {
        console.error("airdrop fail", r.wallet, e);
      }
    }
  }

  const all = await db.collection("leaderboard").orderBy("total_karma", "desc").get();
  const users = all.docs.map((d) => d.id as Address);
  const amounts = all.docs.map((d) => BigInt(Math.floor((d.data().total_karma ?? 0) * 1e6)));
  if (users.length) {
    await wallet()
      .writeContract({ address: FEE_SPLITTER_ADDRESS, abi: feeSplitterAbi, functionName: "setKarma", args: [users, amounts] })
      .catch((e) => console.error("setKarma fail", e));
  }

  const batch = db.batch();
  all.docs.forEach((d, i) => batch.update(d.ref, { epoch_karma: 0, tier: tier(i + 1) }));
  const state = (await altarRef().get()).data() ?? {};
  batch.update(altarRef(), {
    reincarnation_epoch: epoch + 1,
    soul_weight_current: 0,
    soul_weight_target: (state.soul_weight_target ?? 1000) * TARGET_GROWTH,
    death_clock_ends_at: Math.floor(Date.now() / 1000) + (state.epoch_duration_sec ?? EPOCH_DURATION_SEC),
    epoch_duration_sec: state.epoch_duration_sec ?? EPOCH_DURATION_SEC,
    is_locked: false,
    locked_at: null,
    last_updated: Date.now(),
  });
  batch.update(db.doc(`reincarnations/${epoch}`), { airdrop_recipients_count: sent });
  await batch.commit();
  return sent;
}
