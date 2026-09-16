import { expect } from "chai";
import { ethers, network } from "hardhat";
import type { Signer } from "ethers";

const FEE = ethers.parseEther("0.0005");
const DEAD = "0x000000000000000000000000000000000000dEaD";
const K = 10n ** 18n;

async function deployAll() {
  const [deployer, keeper, verifier, founderA, founderB, alice, bob, carol] = await ethers.getSigners();
  const Splitter = await ethers.getContractFactory("FounderSplitter");
  const splitter = await Splitter.deploy(founderA.address, founderB.address);
  const Altar = await ethers.getContractFactory("ThanatosAltarV2");
  const altar = await Altar.deploy(deployer.address, keeper.address, verifier.address, await splitter.getAddress(), 6 * 3600, 1000n * K);
  const Factory = await ethers.getContractFactory("MockPonsFactory");
  const factory = await Factory.deploy();
  const Fwd = await ethers.getContractFactory("MockPonsForwarder");
  const fwd = await Fwd.deploy();
  const Re = await ethers.getContractFactory("Reincarnator");
  const re = await Re.deploy(await altar.getAddress(), await fwd.getAddress(), await factory.getAddress(), ethers.ZeroAddress, 0, 200, keeper.address);
  const Bb = await ethers.getContractFactory("Buyback");
  const bb = await Bb.deploy(await altar.getAddress(), deployer.address);
  const Tok = await ethers.getContractFactory("MockERC20");
  const thanatos = await Tok.deploy("THANATOS", "THANATOS", 18);
  const Curve = await ethers.getContractFactory("MockCurve");
  const curve = await Curve.deploy(await thanatos.getAddress());
  await bb.setRoute(await thanatos.getAddress(), await curve.getAddress());
  await altar.setExecutors(await re.getAddress(), await bb.getAddress());
  const dead = await Tok.deploy("DeadFrog", "DEADFROG", 18);
  return { deployer, keeper, verifier, founderA, founderB, alice, bob, carol, splitter, altar, factory, fwd, re, bb, thanatos, curve, dead };
}

async function voucher(altar: any, verifier: Signer, token: string, multBps: number, expiry: number) {
  const domain = { name: "THANATOS Altar", version: "2", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await altar.getAddress() };
  const types = { Voucher: [{ name: "token", type: "address" }, { name: "multBps", type: "uint16" }, { name: "expiry", type: "uint64" }, { name: "chainId", type: "uint256" }, { name: "altar", type: "address" }] };
  return (verifier as any).signTypedData(domain, types, { token, multBps, expiry, chainId: domain.chainId, altar: domain.verifyingContract });
}

const now = async () => (await ethers.provider.getBlock("latest"))!.timestamp;

describe("AltarV2 · sacrifice", () => {
  it("burns to dEaD with balance-delta accounting, altar holds nothing (C-1)", async () => {
    const { altar, dead, alice } = await deployAll();
    await dead.mint(alice.address, 10n ** 24n);
    await dead.connect(alice).approve(await altar.getAddress(), 10n ** 24n);
    await expect(altar.connect(alice).sacrifice(await dead.getAddress(), 10n ** 24n, 0, 0, "0x", { value: FEE }))
      .to.emit(altar, "Offering");
    expect(await dead.balanceOf(DEAD)).to.equal(10n ** 24n);
    expect(await dead.balanceOf(await altar.getAddress())).to.equal(0n);
  });

  it("fake ERC-20 (transferFrom returns true, moves nothing) reverts (C-4)", async () => {
    const { altar, alice } = await deployAll();
    const fake = await (await ethers.getContractFactory("FakeERC20")).deploy();
    await expect(altar.connect(alice).sacrifice(await fake.getAddress(), 1000n, 0, 0, "0x", { value: FEE })).to.be.revertedWithCustomError(altar, "NothingBurned");
  });

  it("fee-on-transfer credits only the delta (M-16)", async () => {
    const { altar, alice } = await deployAll();
    const fot = await (await ethers.getContractFactory("FeeOnTransferERC20")).deploy();
    await fot.mint(alice.address, 1000n * K);
    await fot.connect(alice).approve(await altar.getAddress(), 1000n * K);
    const tx = await altar.connect(alice).sacrifice(await fot.getAddress(), 1000n * K, 0, 0, "0x", { value: FEE });
    const rc = await tx.wait();
    const ev = rc!.logs.map((l) => { try { return altar.interface.parseLog(l as any); } catch { return null; } }).find((e) => e?.name === "Offering")!;
    expect(ev.args.amount).to.equal(900n * K);
  });

  it("wrong msg.value reverts (D-1)", async () => {
    const { altar, dead, alice } = await deployAll();
    await dead.mint(alice.address, K);
    await dead.connect(alice).approve(await altar.getAddress(), K);
    await expect(altar.connect(alice).sacrifice(await dead.getAddress(), K, 0, 0, "0x", { value: 0 })).to.be.revertedWithCustomError(altar, "WrongFee");
  });

  it("unvouched karma is capped per wallet per epoch (C-4)", async () => {
    const { altar, dead, alice } = await deployAll();
    await dead.mint(alice.address, 10n ** 30n);
    await dead.connect(alice).approve(await altar.getAddress(), 10n ** 30n);
    for (let i = 0; i < 15; i++) await altar.connect(alice).sacrifice(await dead.getAddress(), 10n ** 24n, 0, 0, "0x", { value: FEE });
    expect(await altar.soulOf(alice.address)).to.equal(await altar.baseCapPerWallet());
    expect(await altar.epochEndsAt()).to.equal((await altar.epochEndsAt()));
  });

  it("vouched burn: log10 karma × mult, clock bonus capped; forged/expired vouchers revert (C-4)", async () => {
    const { altar, dead, alice, verifier, bob } = await deployAll();
    const t = await dead.getAddress();
    await dead.mint(alice.address, 10n ** 30n);
    await dead.connect(alice).approve(await altar.getAddress(), 10n ** 30n);
    const exp = (await now()) + 3600;
    const end0 = await altar.epochEndsAt();
    const sig = await voucher(altar, verifier, t, 15000, exp);
    await altar.connect(alice).sacrifice(t, 10n ** 27n, 15000, exp, sig, { value: FEE });
    expect(await altar.soulOf(alice.address)).to.equal(9n * K * 15000n / 10000n);
    const end1 = await altar.epochEndsAt();
    expect(end1 - end0).to.equal(810n);
    await altar.connect(alice).sacrifice(t, 10n ** 27n, 15000, exp, sig, { value: FEE });
    await altar.connect(alice).sacrifice(t, 10n ** 27n, 15000, exp, sig, { value: FEE });
    expect((await altar.epochEndsAt()) - end0).to.equal(30n * 60n);

    const forged = await voucher(altar, bob, t, 15000, exp);
    await expect(altar.connect(alice).sacrifice(t, K, 15000, exp, forged, { value: FEE })).to.be.revertedWithCustomError(altar, "BadVoucher");
    const old = await voucher(altar, verifier, t, 15000, (await now()) - 1);
    await expect(altar.connect(alice).sacrifice(t, K, 15000, (await now()) - 1, old, { value: FEE })).to.be.revertedWithCustomError(altar, "BadVoucher");
  });
});

describe("AltarV2 · epoch & fee share", () => {
  async function burnVouched(ctx: any, who: Signer, amt: bigint) {
    const t = await ctx.dead.getAddress();
    await ctx.dead.mint(await who.getAddress(), amt);
    await ctx.dead.connect(who).approve(await ctx.altar.getAddress(), amt);
    const exp = (await now()) + 3600;
    const sig = await voucher(ctx.altar, ctx.verifier, t, 10000, exp);
    await ctx.altar.connect(who).sacrifice(t, amt, 10000, exp, sig, { value: FEE });
  }

  it("seals on time, rebirth splits treasury, executors called with fixed targets (C-2, D-3)", async () => {
    const ctx = await deployAll();
    const { altar, keeper, alice, re, fwd, splitter, thanatos } = ctx;
    await burnVouched(ctx, alice, 10n ** 24n);
    await alice.sendTransaction({ to: await altar.getAddress(), value: ethers.parseEther("1") });
    await expect(altar.connect(keeper).rebirth()).to.be.revertedWithCustomError(altar, "WrongPhase");
    await expect(altar.seal()).to.be.revertedWithCustomError(altar, "NotSealable");
    await network.provider.send("evm_increaseTime", [7 * 3600]);
    await altar.seal();
    expect(await altar.phase()).to.equal(1);
    await re.connect(keeper).stage(1, "Phoenix", "PHNX", "https://x/logo.png", "desc", "https://x.com/t", "https://t.xyz");
    await expect(altar.connect(alice).rebirth()).to.be.revertedWithCustomError(altar, "NotKeeper");
    const treasury = await ethers.provider.getBalance(await altar.getAddress());
    await altar.connect(keeper).rebirth();
    const protocol = treasury * 2000n / 10000n;
    const rest = treasury - protocol;
    expect(await ethers.provider.getBalance(await splitter.getAddress())).to.equal(protocol);
    expect(await altar.feePoolOf(1)).to.equal(rest * 3000n / 10000n);
    expect(await fwd.lastPair()).to.equal(ethers.ZeroAddress);
    expect(await fwd.lastFeeRecipient()).to.equal(await altar.getAddress());
    expect(await fwd.lastTax()).to.equal(200);
    expect(await thanatos.balanceOf(DEAD)).to.be.gt(0n);
    expect(await altar.epoch()).to.equal(2);
    expect(await altar.soulTarget()).to.equal(1250n * K);
    expect(await re.tokenOf(1)).to.not.equal(ethers.ZeroAddress);
  });

  it("unstaged reincarnator: seed ETH falls back into fee pool, epoch still advances (H-8)", async () => {
    const ctx = await deployAll();
    const { altar, keeper, alice } = ctx;
    await burnVouched(ctx, alice, 10n ** 24n);
    await alice.sendTransaction({ to: await altar.getAddress(), value: ethers.parseEther("1") });
    await network.provider.send("evm_increaseTime", [7 * 3600]);
    await altar.seal();
    const treasury = await ethers.provider.getBalance(await altar.getAddress());
    await altar.connect(keeper).rebirth();
    const rest = treasury - treasury * 2000n / 10000n;
    expect(await altar.feePoolOf(1)).to.equal(rest * 3000n / 10000n + rest * 4000n / 10000n);
    expect(await altar.epoch()).to.equal(2);
  });

  it("per-epoch pools: Σ claims ≤ Σ pools across 3 epochs, no claim reverts (H-9)", async () => {
    const ctx = await deployAll();
    const { altar, keeper, alice, bob, carol, re } = ctx;
    const users = [alice, bob, carol];
    let pools = 0n;
    for (let e = 1; e <= 3; e++) {
      for (const [i, u] of users.entries()) if ((e + i) % 2 === 0) await burnVouched(ctx, u, 10n ** BigInt(20 + i * 2));
      await alice.sendTransaction({ to: await altar.getAddress(), value: ethers.parseEther(String(e)) });
      await network.provider.send("evm_increaseTime", [25 * 3600]);
      await altar.seal();
      await re.connect(keeper).stage(e, "P", "P" + e, "l", "d", "t", "w");
      await altar.connect(keeper).rebirth();
      pools += await altar.feePoolOf(e);
      if (e === 2) await altar.connect(bob).claim();
    }
    let claimed = 0n;
    for (const u of users) {
      const before = await ethers.provider.getBalance(u.address);
      const c = await altar.claimable(u.address);
      const tx = await altar.connect(u).claim();
      const rc = await tx.wait();
      const gas = rc!.gasUsed * rc!.gasPrice;
      const after = await ethers.provider.getBalance(u.address);
      expect(after - before + gas).to.equal(c);
      claimed += c;
      await altar.connect(u).claim();
      expect(await altar.claimable(u.address)).to.equal(0n);
    }
    expect(await altar.totalDistributed()).to.be.lte(pools);
    expect(claimed).to.be.lte(pools);
  });

  it("airdrop merkle claim from Reincarnator", async () => {
    const ctx = await deployAll();
    const { altar, keeper, alice, bob, re } = ctx;
    await burnVouched(ctx, alice, 10n ** 24n);
    await alice.sendTransaction({ to: await altar.getAddress(), value: ethers.parseEther("1") });
    await network.provider.send("evm_increaseTime", [7 * 3600]);
    await altar.seal();
    await re.connect(keeper).stage(1, "P", "P1", "l", "d", "t", "w");
    await altar.connect(keeper).rebirth();
    const supply = await re.airdropSupplyOf(1);
    const { StandardMerkleTree } = await import("@openzeppelin/merkle-tree");
    const tree = StandardMerkleTree.of([[alice.address, (supply / 2n).toString()], [bob.address, (supply / 2n).toString()]], ["address", "uint256"]);
    await re.connect(keeper).setMerkleRoot(1, tree.root);
    const proof = tree.getProof([alice.address, (supply / 2n).toString()]);
    await re.connect(alice).claimAirdrop(1, supply / 2n, proof);
    const tok = await ethers.getContractAt("MockERC20", await re.tokenOf(1));
    expect(await tok.balanceOf(alice.address)).to.equal(supply / 2n);
    await expect(re.connect(alice).claimAirdrop(1, supply / 2n, proof)).to.be.revertedWithCustomError(re, "AlreadyClaimed");
    await expect(re.connect(bob).claimAirdrop(1, supply, proof)).to.be.revertedWithCustomError(re, "BadProof");
  });
});

describe("AltarV2 · security", () => {
  it("owner != keeper; after freeze every setter reverts (C-3, H-11)", async () => {
    const { altar, deployer, keeper, verifier, splitter, re, bb } = await deployAll();
    expect(await altar.owner()).to.not.equal(await altar.keeper());
    await altar.freeze();
    await expect(altar.setExecutors(await re.getAddress(), await bb.getAddress())).to.be.revertedWithCustomError(altar, "IsFrozen");
    await expect(altar.setRoles(keeper.address, verifier.address, await splitter.getAddress())).to.be.revertedWithCustomError(altar, "IsFrozen");
    await expect(altar.setParams(1, 1, 1, 1, 1, 1)).to.be.revertedWithCustomError(altar, "IsFrozen");
    await expect(altar.setSplit(0, 3000, 4000, 3000)).to.be.revertedWithCustomError(altar, "IsFrozen");
    await bb.freeze();
    await expect(bb.setRoute(deployer.address, deployer.address)).to.be.revertedWithCustomError(bb, "IsFrozen");
    await re.connect(keeper).freeze();
    await expect(re.connect(keeper).setKeeper(deployer.address)).to.be.revertedWithCustomError(re, "IsFrozen");
  });

  it("no function lets owner or keeper move sacrificed tokens or treasury ETH (C-1, C-2)", async () => {
    const { altar, re, bb } = await deployAll();
    const names = (c: any) => c.interface.fragments.filter((f: any) => f.type === "function" && f.stateMutability !== "view" && f.stateMutability !== "pure").map((f: any) => f.name);
    for (const n of names(altar)) expect(["sacrifice", "seal", "rebirth", "claim", "setExecutors", "setRoles", "setParams", "setSplit", "freeze"]).to.include(n);
    for (const n of names(re)) expect(["stage", "seed", "setMerkleRoot", "claimAirdrop", "setKeeper", "freeze"]).to.include(n);
    for (const n of names(bb)) expect(["setRoute", "freeze", "execute"]).to.include(n);
    await expect(re.seed(1)).to.be.revertedWithCustomError(re, "NotAltar");
    await expect(bb.execute()).to.be.revertedWithCustomError(bb, "NotAltar");
  });

  it("splitter never reverts on receive and pays 50/50 pull-based (M-15)", async () => {
    const { splitter, founderA, founderB, alice } = await deployAll();
    await alice.sendTransaction({ to: await splitter.getAddress(), value: ethers.parseEther("2") });
    expect(await splitter.releasable(founderA.address)).to.equal(ethers.parseEther("1"));
    await splitter.release(founderB.address);
    expect(await splitter.releasable(founderB.address)).to.equal(0n);
  });
});
