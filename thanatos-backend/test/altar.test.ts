import { expect } from "chai";
import { ethers, network } from "hardhat";
import type { Signer } from "ethers";

const FEE = ethers.parseEther("0.0005");
const DEAD = "0x000000000000000000000000000000000000dEaD";
const K = 10n ** 18n;
const H = 3600;

async function deployAll() {
  const [deployer, keeper, verifier, founderA, founderB, alice, bob, carol] = await ethers.getSigners();
  const splitter = await ethers.deployContract("FounderSplitter", [founderA.address, founderB.address]);
  const escrow = await ethers.deployContract("MockEscrow");
  const altar = await ethers.deployContract("ThanatosAltarV2", [
    deployer.address, keeper.address, verifier.address, await splitter.getAddress(), await escrow.getAddress(), 6 * H, 1000n * K,
  ]);
  const factory = await ethers.deployContract("MockPonsFactory");
  const fwd = await ethers.deployContract("MockPonsForwarder");
  const re = await ethers.deployContract("Reincarnator", [await altar.getAddress(), await fwd.getAddress(), await factory.getAddress(), ethers.ZeroAddress, 0, 200]);
  const bb = await ethers.deployContract("Buyback", [await altar.getAddress(), deployer.address]);
  const thanatos = await ethers.deployContract("MockERC20", ["THANATOS", "THANATOS", 18]);
  const curve = await ethers.deployContract("MockCurve", [await thanatos.getAddress()]);
  await altar.setExecutors(await re.getAddress(), await bb.getAddress());
  const dead = await ethers.deployContract("MockERC20", ["DeadFrog", "DEADFROG", 18]);
  return { deployer, keeper, verifier, founderA, founderB, alice, bob, carol, splitter, escrow, altar, factory, fwd, re, bb, thanatos, curve, dead };
}
type Ctx = Awaited<ReturnType<typeof deployAll>>;

async function voucher(altar: any, verifier: Signer, token: string, multBps: number, expiry: number) {
  const domain = { name: "THANATOS Altar", version: "2", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await altar.getAddress() };
  const types = { Voucher: [{ name: "token", type: "address" }, { name: "multBps", type: "uint16" }, { name: "expiry", type: "uint64" }, { name: "chainId", type: "uint256" }, { name: "altar", type: "address" }] };
  return (verifier as any).signTypedData(domain, types, { token, multBps, expiry, chainId: domain.chainId, altar: domain.verifyingContract });
}

const now = async () => (await ethers.provider.getBlock("latest"))!.timestamp;
const warp = (s: number) => network.provider.send("evm_increaseTime", [s]);

async function burn(ctx: Ctx, who: Signer, amt: bigint, multBps = 0) {
  const t = await ctx.dead.getAddress();
  await ctx.dead.mint(await who.getAddress(), amt);
  await ctx.dead.connect(who).approve(await ctx.altar.getAddress(), amt);
  if (!multBps) return ctx.altar.connect(who).sacrifice(t, amt, 0, 0, "0x", { value: FEE });
  const exp = (await now()) + H;
  const sig = await voucher(ctx.altar, ctx.verifier, t, multBps, exp);
  return ctx.altar.connect(who).sacrifice(t, amt, multBps, exp, sig, { value: FEE });
}

async function fund(ctx: Ctx, eth: string) {
  await ctx.alice.sendTransaction({ to: await ctx.altar.getAddress(), value: ethers.parseEther(eth) });
}

async function enableRoute(ctx: Ctx) {
  await ctx.bb.proposeRoute(await ctx.curve.getAddress());
  await warp(48 * H);
  await ctx.bb.applyRoute();
}

describe("AltarV2 · sacrifice", () => {
  it("burns to dEaD with balance-delta accounting, altar holds nothing", async () => {
    const ctx = await deployAll();
    await expect(burn(ctx, ctx.alice, 10n ** 24n)).to.emit(ctx.altar, "Offering");
    expect(await ctx.dead.balanceOf(DEAD)).to.equal(10n ** 24n);
    expect(await ctx.dead.balanceOf(await ctx.altar.getAddress())).to.equal(0n);
  });

  it("fake ERC-20 (transferFrom returns true, moves nothing) reverts", async () => {
    const { altar, alice } = await deployAll();
    const fake = await ethers.deployContract("FakeERC20");
    await expect(altar.connect(alice).sacrifice(await fake.getAddress(), 1000n, 0, 0, "0x", { value: FEE })).to.be.revertedWithCustomError(altar, "NothingBurned");
  });

  it("fee-on-transfer credits only the delta", async () => {
    const { altar, alice } = await deployAll();
    const fot = await ethers.deployContract("FeeOnTransferERC20");
    await fot.mint(alice.address, 1000n * K);
    await fot.connect(alice).approve(await altar.getAddress(), 1000n * K);
    await expect(altar.connect(alice).sacrifice(await fot.getAddress(), 1000n * K, 0, 0, "0x", { value: FEE }))
      .to.emit(altar, "Offering").withArgs(1, alice.address, await fot.getAddress(), 900n * K, 5n * K, false, 0, FEE);
  });

  it("wrong msg.value reverts", async () => {
    const ctx = await deployAll();
    await ctx.dead.mint(ctx.alice.address, K);
    await ctx.dead.connect(ctx.alice).approve(await ctx.altar.getAddress(), K);
    await expect(ctx.altar.connect(ctx.alice).sacrifice(await ctx.dead.getAddress(), K, 0, 0, "0x", { value: 0 })).to.be.revertedWithCustomError(ctx.altar, "WrongFee");
  });

  it("unverified karma is small, capped per wallet per epoch, and never moves the clock", async () => {
    const ctx = await deployAll();
    const end0 = await ctx.altar.epochEndsAt();
    for (let i = 0; i < 8; i++) await burn(ctx, ctx.alice, 10n ** 24n);
    expect(await ctx.altar.soulOf(ctx.alice.address)).to.equal(await ctx.altar.unverifiedCap());
    expect(await ctx.altar.epochEndsAt()).to.equal(end0);
  });

  it("one verified burn outweighs a wallet's whole unverified cap", async () => {
    const ctx = await deployAll();
    await burn(ctx, ctx.alice, K, 15000);
    expect(await ctx.altar.soulOf(ctx.alice.address)).to.equal(57n * K); // 38 x 1.5, amount bonus log10(2) = 0
    expect(await ctx.altar.soulOf(ctx.alice.address)).to.be.gt(await ctx.altar.unverifiedCap());
    await burn(ctx, ctx.bob, 10n ** 27n, 10000);
    expect(await ctx.altar.soulOf(ctx.bob.address)).to.equal(47n * K); // 38 + log10(1e9)
  });

  it("verified burn extends the clock up to the per-wallet cap; forged and expired vouchers revert", async () => {
    const ctx = await deployAll();
    const t = await ctx.dead.getAddress();
    const end0 = await ctx.altar.epochEndsAt();
    await burn(ctx, ctx.alice, K, 10000);
    expect((await ctx.altar.epochEndsAt()) - end0).to.equal(30n * 60n); // 38 min capped at 30
    await burn(ctx, ctx.alice, K, 10000);
    expect((await ctx.altar.epochEndsAt()) - end0).to.equal(30n * 60n);

    const exp = (await now()) + H;
    await ctx.dead.mint(ctx.alice.address, K);
    await ctx.dead.connect(ctx.alice).approve(await ctx.altar.getAddress(), K);
    const forged = await voucher(ctx.altar, ctx.bob, t, 15000, exp);
    await expect(ctx.altar.connect(ctx.alice).sacrifice(t, K, 15000, exp, forged, { value: FEE })).to.be.revertedWithCustomError(ctx.altar, "BadVoucher");
    const past = (await now()) - 1;
    const old = await voucher(ctx.altar, ctx.verifier, t, 15000, past);
    await expect(ctx.altar.connect(ctx.alice).sacrifice(t, K, 15000, past, old, { value: FEE })).to.be.revertedWithCustomError(ctx.altar, "BadVoucher");
  });
});

describe("AltarV2 · epoch lifecycle", () => {
  it("a full bar before minEpochDuration only pulls the clock down to it", async () => {
    const ctx = await deployAll();
    await fund(ctx, "1");
    const start = await ctx.altar.epochStartedAt();
    for (let i = 0; i < 20; i++) await burn(ctx, ctx.alice, K, 15000); // 20 x 57 > 1000
    expect(await ctx.altar.phase()).to.equal(0);
    expect(await ctx.altar.epochEndsAt()).to.equal(start + BigInt(6 * H));
    await warp(6 * H + 1);
    await ctx.altar.seal();
    expect(await ctx.altar.phase()).to.equal(1);
  });

  it("a full bar after minEpochDuration seals immediately", async () => {
    const ctx = await deployAll();
    await fund(ctx, "1");
    await warp(6 * H + 1);
    for (let i = 0; i < 18; i++) await burn(ctx, ctx.alice, K, 15000); // 18 x 57 >= 1000
    expect(await ctx.altar.phase()).to.equal(1);
  });

  it("clock zero with treasury below minTreasury extends instead of sealing", async () => {
    const ctx = await deployAll();
    await burn(ctx, ctx.alice, K, 15000);
    await warp(7 * H);
    await expect(ctx.altar.seal()).to.emit(ctx.altar, "Extended");
    expect(await ctx.altar.phase()).to.equal(0);
    await expect(burn(ctx, ctx.bob, K)).to.emit(ctx.altar, "Offering");
    await fund(ctx, "0.01");
    await warp(6 * H + 1);
    await expect(ctx.altar.seal()).to.emit(ctx.altar, "Sealed");
  });

  it("rebirth splits the treasury; executors are called with fixed targets and the correct curve signature", async () => {
    const ctx = await deployAll();
    const { altar, keeper, alice, re, fwd, splitter, thanatos } = ctx;
    await burn(ctx, alice, 10n ** 24n, 15000);
    await fund(ctx, "1");
    await expect(altar.connect(keeper).rebirth(0)).to.be.revertedWithCustomError(altar, "WrongPhase");
    await expect(altar.seal()).to.be.revertedWithCustomError(altar, "NotSealable");
    await enableRoute(ctx); // 48h later: clock has run out
    await altar.seal();
    await re.connect(keeper).stage(1, "Phoenix", "PHNX", "https://x/logo.png", "desc", "https://x.com/t", "https://t.xyz");
    await expect(altar.connect(alice).rebirth(0)).to.be.revertedWithCustomError(altar, "NotKeeper");
    const pot = await altar.treasury();
    await altar.connect(keeper).rebirth(0);
    const protocol = pot * 2000n / 10000n;
    const rest = pot - protocol;
    const feeShare = rest * 3000n / 10000n;
    const seed = rest * 4000n / 10000n;
    expect(await ethers.provider.getBalance(await splitter.getAddress())).to.equal(protocol);
    expect(await altar.feePoolOf(1)).to.equal(feeShare);
    expect(await fwd.lastPair()).to.equal(ethers.ZeroAddress);
    expect(await fwd.lastFeeRecipient()).to.equal(await altar.getAddress());
    expect(await fwd.lastTax()).to.equal(200);
    expect(await fwd.lastValue()).to.equal(seed);
    expect(await thanatos.balanceOf(DEAD)).to.equal((rest - feeShare - seed) * 1000n);
    expect(await altar.buybackReserve()).to.equal(0n);
    expect(await altar.epoch()).to.equal(2);
    expect(await altar.soulTarget()).to.equal(1250n * K);
    expect(await re.tokenOf(1)).to.not.equal(ethers.ZeroAddress);
  });

  it("unstaged reincarnator: seed ETH falls back into the fee pool, epoch still advances", async () => {
    const ctx = await deployAll();
    await enableRoute(ctx);
    await burn(ctx, ctx.alice, 10n ** 24n, 15000);
    await fund(ctx, "1");
    await warp(7 * H);
    await ctx.altar.seal();
    const pot = await ctx.altar.treasury();
    await ctx.altar.connect(ctx.keeper).rebirth(0);
    const rest = pot - pot * 2000n / 10000n;
    expect(await ctx.altar.feePoolOf(1)).to.equal(rest * 3000n / 10000n + rest * 4000n / 10000n);
    expect(await ctx.altar.epoch()).to.equal(2);
  });

  it("no buyback route: ETH waits in buybackReserve, never in fee share, and runs later", async () => {
    const ctx = await deployAll();
    await burn(ctx, ctx.alice, 10n ** 24n, 15000);
    await fund(ctx, "1");
    await warp(7 * H);
    await ctx.altar.seal();
    await ctx.re.connect(ctx.keeper).stage(1, "P", "P1", "l", "d", "t", "w");
    const pot = await ctx.altar.treasury();
    await ctx.altar.connect(ctx.keeper).rebirth(0);
    const rest = pot - pot * 2000n / 10000n;
    const expected = rest - rest * 3000n / 10000n - rest * 4000n / 10000n;
    expect(await ctx.altar.buybackReserve()).to.equal(expected);
    expect(await ctx.altar.feePoolOf(1)).to.equal(rest * 3000n / 10000n);
    expect(await ctx.altar.treasury()).to.equal(0n);

    await enableRoute(ctx);
    await expect(ctx.altar.connect(ctx.alice).runBuyback(0)).to.be.revertedWithCustomError(ctx.altar, "NotKeeper");
    await ctx.altar.connect(ctx.keeper).runBuyback(expected * 1000n + 1n); // floor too high: stays reserved
    expect(await ctx.altar.buybackReserve()).to.equal(expected);
    await ctx.altar.connect(ctx.keeper).runBuyback(expected * 1000n);
    expect(await ctx.altar.buybackReserve()).to.equal(0n);
    expect(await ctx.thanatos.balanceOf(DEAD)).to.equal(expected * 1000n);
  });

  it("collect() pulls creator revenue from the Pons escrow into the treasury", async () => {
    const ctx = await deployAll();
    await ctx.escrow.credit(await ctx.altar.getAddress(), { value: ethers.parseEther("0.3") });
    await expect(ctx.altar.collect()).to.emit(ctx.altar, "TreasuryIn").withArgs(await ctx.escrow.getAddress(), ethers.parseEther("0.3"));
    expect(await ctx.altar.treasury()).to.equal(ethers.parseEther("0.3"));
    await ctx.altar.collect();
    expect(await ctx.altar.treasury()).to.equal(ethers.parseEther("0.3"));
  });

  it("per-epoch pools: sum of claims <= sum of pools across 3 epochs, no claim reverts", async () => {
    const ctx = await deployAll();
    const { altar, keeper, alice, bob, carol, re } = ctx;
    await enableRoute(ctx);
    const users = [alice, bob, carol];
    let pools = 0n;
    for (let e = 1; e <= 3; e++) {
      for (const [i, u] of users.entries()) if ((e + i) % 2 === 0) await burn(ctx, u, 10n ** BigInt(20 + i * 2), 10000);
      await fund(ctx, String(e));
      await warp(25 * H);
      await altar.seal();
      await re.connect(keeper).stage(e, "P", "P" + e, "l", "d", "t", "w");
      await altar.connect(keeper).rebirth(0);
      pools += await altar.feePoolOf(e);
      if (e === 2) await altar.connect(bob).claim();
    }
    let claimed = 0n;
    for (const u of users) {
      const before = await ethers.provider.getBalance(u.address);
      const c = await altar.claimable(u.address);
      const rc = await (await altar.connect(u).claim()).wait();
      const after = await ethers.provider.getBalance(u.address);
      expect(after - before + rc!.gasUsed * rc!.gasPrice).to.equal(c);
      claimed += c;
      await altar.connect(u).claim();
      expect(await altar.claimable(u.address)).to.equal(0n);
    }
    expect(await altar.totalDistributed()).to.be.lte(pools);
    expect(claimed).to.be.lte(pools);
  });

  it("airdrop: every burner claims the seed buy pro-rata by epoch karma", async () => {
    const ctx = await deployAll();
    const { altar, keeper, alice, bob, carol, re } = ctx;
    await enableRoute(ctx);
    await burn(ctx, alice, K, 10000); // 38
    await burn(ctx, bob, K, 15000); // 57
    await fund(ctx, "1");
    await warp(7 * H);
    await altar.seal();
    await re.connect(keeper).stage(1, "P", "P1", "l", "d", "t", "w");
    await altar.connect(keeper).rebirth(0);
    const supply = await re.airdropSupplyOf(1);
    expect(await re.airdropOf(1, alice.address)).to.equal(supply * 38n / 95n);
    expect(await re.airdropOf(1, carol.address)).to.equal(0n);
    await re.connect(alice).claimAirdrop(1);
    const tok = await ethers.getContractAt("MockERC20", await re.tokenOf(1));
    expect(await tok.balanceOf(alice.address)).to.equal(supply * 38n / 95n);
    await expect(re.connect(alice).claimAirdrop(1)).to.be.revertedWithCustomError(re, "AlreadyClaimed");
    await expect(re.connect(carol).claimAirdrop(1)).to.be.revertedWithCustomError(re, "NothingToClaim");
  });
});

describe("AltarV2 · security", () => {
  it("owner != keeper; after freeze every setter reverts", async () => {
    const { altar, keeper, verifier, splitter, re, bb } = await deployAll();
    expect(await altar.owner()).to.not.equal(await altar.keeper());
    await altar.freeze();
    await expect(altar.setExecutors(await re.getAddress(), await bb.getAddress())).to.be.revertedWithCustomError(altar, "IsFrozen");
    await expect(altar.setRoles(keeper.address, verifier.address, await splitter.getAddress())).to.be.revertedWithCustomError(altar, "IsFrozen");
    await expect(altar.setParams(1, 2, 1, 1, 1, 1, 1, 1, 1)).to.be.revertedWithCustomError(altar, "IsFrozen");
    await expect(altar.setSplit(0, 3000, 4000, 3000)).to.be.revertedWithCustomError(altar, "IsFrozen");
  });

  it("protocol split is capped at 30% and the unverified cap must stay below one verified burn", async () => {
    const { altar } = await deployAll();
    await expect(altar.setSplit(3001, 3000, 4000, 3000)).to.be.revertedWith("split");
    await expect(altar.setParams(FEE, 38n * K, 5n * K, 38n * K, 1800, 6 * H, 24 * H, 0, 12500)).to.be.revertedWith("params");
  });

  it("no function lets owner or keeper move sacrificed tokens or treasury ETH", async () => {
    const { altar, re, bb } = await deployAll();
    const names = (c: any) => c.interface.fragments.filter((f: any) => f.type === "function" && f.stateMutability !== "view" && f.stateMutability !== "pure").map((f: any) => f.name);
    for (const n of names(altar)) expect(["sacrifice", "seal", "rebirth", "runBuyback", "collect", "claim", "setExecutors", "setRoles", "setParams", "setSplit", "freeze"]).to.include(n);
    for (const n of names(re)) expect(["stage", "seed", "claimAirdrop"]).to.include(n);
    for (const n of names(bb)) expect(["proposeRoute", "applyRoute", "execute"]).to.include(n);
    await expect(re.seed(1)).to.be.revertedWithCustomError(re, "NotAltar");
    await expect(bb.execute(0)).to.be.revertedWithCustomError(bb, "NotAltar");
  });

  it("buyback route changes take 48 hours and only the owner can propose", async () => {
    const ctx = await deployAll();
    await expect(ctx.bb.connect(ctx.alice).proposeRoute(ctx.alice.address)).to.be.revertedWithCustomError(ctx.bb, "NotOwner");
    await ctx.bb.proposeRoute(await ctx.curve.getAddress());
    await expect(ctx.bb.applyRoute()).to.be.revertedWithCustomError(ctx.bb, "RouteNotReady");
    await warp(48 * H);
    await ctx.bb.applyRoute();
    expect(await ctx.bb.route()).to.equal(await ctx.curve.getAddress());
  });

  it("splitter never reverts on receive and pays 50/50 pull-based", async () => {
    const { splitter, founderA, founderB, alice } = await deployAll();
    await alice.sendTransaction({ to: await splitter.getAddress(), value: ethers.parseEther("2") });
    expect(await splitter.releasable(founderA.address)).to.equal(ethers.parseEther("1"));
    await splitter.release(founderB.address);
    expect(await splitter.releasable(founderB.address)).to.equal(0n);
  });
});
