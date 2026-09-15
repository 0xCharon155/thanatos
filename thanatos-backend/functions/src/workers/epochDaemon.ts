import { altarRef } from "../config/firebase";
import { tweet } from "../services/twitterService";
import { acquireLock, releaseLock } from "../utils/lock";
import { runAirdropAndReset } from "./airdrop";
import { runReincarnation } from "./relayer";

const WARN_HOURS = [12, 6, 1];

export async function evaluateEpoch() {
  const snap = await altarRef().get();
  const s = snap.data();
  if (!s) return "no-state";
  const now = Math.floor(Date.now() / 1000);
  const remainingH = (s.death_clock_ends_at - now) / 3600;

  for (const h of WARN_HOURS) {
    if (remainingH <= h && !(s.warned ?? []).includes(h)) {
      await tweet(`${h}h remain before the Altar closes Epoch #${s.reincarnation_epoch}. ${s.soul_weight_current.toFixed(0)}/${s.soul_weight_target} souls gathered.`);
      await altarRef().update({ warned: [...(s.warned ?? []), h] });
    }
  }

  const due = now >= s.death_clock_ends_at || s.soul_weight_current >= s.soul_weight_target;
  if (!due) return "waiting";
  if (!(await acquireLock())) return "locked";

  try {
    const epoch = s.reincarnation_epoch;
    const { tokenAddress } = await runReincarnation(epoch);
    await runAirdropAndReset(epoch, tokenAddress);
    await altarRef().update({ warned: [] });
    return "reborn";
  } catch (e) {
    console.error("epoch failed", e);
    await releaseLock();
    throw e;
  }
}
