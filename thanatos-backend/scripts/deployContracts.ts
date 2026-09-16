import { ethers, run, network } from "hardhat";

/**
 * Deploys THANATOS v2 from the DEPLOYER key (cold wallet). Agent/verifier are addresses only.
 * Env: DEPLOYER_PRIVATE_KEY, AGENT_PUBLIC_ADDRESS, VERIFIER_PUBLIC_ADDRESS,
 *      FOUNDER_A, FOUNDER_B, PONS_FACTORY_ADDRESS, PONS_FORWARDER_ADDRESS,
 *      PONS_PAIR_TOKEN (0x0 for ETH), LAUNCH_CONFIG_ID (0), CREATOR_TAX_BPS (200),
 *      FIRST_EPOCH_SECONDS (21600), SOUL_TARGET (1000)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const env = (k: string, d?: string) => {
    const v = process.env[k] ?? d;
    if (v === undefined) throw new Error(`missing env ${k}`);
    return v;
  };
  const agent = env("AGENT_PUBLIC_ADDRESS");
  const verifier = env("VERIFIER_PUBLIC_ADDRESS");
  const founderA = env("FOUNDER_A");
  const founderB = env("FOUNDER_B");
  const factory = env("PONS_FACTORY_ADDRESS", "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e");
  const forwarder = env("PONS_FORWARDER_ADDRESS", "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948");
  const pairToken = env("PONS_PAIR_TOKEN", ethers.ZeroAddress);
  const configId = BigInt(env("LAUNCH_CONFIG_ID", "0"));
  const taxBps = Number(env("CREATOR_TAX_BPS", "200"));
  const firstEpoch = BigInt(env("FIRST_EPOCH_SECONDS", String(6 * 3600)));
  const target = ethers.parseEther(env("SOUL_TARGET", "1000"));

  if (deployer.address.toLowerCase() === agent.toLowerCase()) throw new Error("deployer must not be the agent key (C-3)");
  console.log("network", network.name, "deployer", deployer.address);

  if (network.name !== "hardhat") {
    const f = await ethers.getContractAt(["function launchEnabled() view returns (bool)", "function launchForwarder() view returns (address)", "function previewLaunchEconomics(uint256,address) view returns (bytes32)"], factory);
    if (!(await f.launchEnabled())) throw new Error("Pons launches disabled");
    if ((await f.launchForwarder()).toLowerCase() !== forwarder.toLowerCase()) throw new Error("forwarder mismatch");
    console.log("econ", await f.previewLaunchEconomics(configId, pairToken), "pair", pairToken);
  }

  const splitter = await ethers.deployContract("FounderSplitter", [founderA, founderB]);
  await splitter.waitForDeployment();
  const altar = await ethers.deployContract("ThanatosAltarV2", [deployer.address, agent, verifier, await splitter.getAddress(), firstEpoch, target]);
  await altar.waitForDeployment();
  const re = await ethers.deployContract("Reincarnator", [await altar.getAddress(), forwarder, factory, pairToken, configId, taxBps, agent]);
  await re.waitForDeployment();
  const bb = await ethers.deployContract("Buyback", [await altar.getAddress(), deployer.address]);
  await bb.waitForDeployment();
  await (await altar.setExecutors(await re.getAddress(), await bb.getAddress())).wait();

  const out = {
    FOUNDER_SPLITTER_ADDRESS: await splitter.getAddress(),
    ALTAR_ADDRESS: await altar.getAddress(),
    REINCARNATOR_ADDRESS: await re.getAddress(),
    BUYBACK_ADDRESS: await bb.getAddress(),
    ALTAR_DEPLOY_BLOCK: (await ethers.provider.getBlockNumber()).toString(),
  };
  console.log(Object.entries(out).map(([k, v]) => `${k}=${v}`).join("\n"));
  console.log("\nNEXT: after $THANATOS launches -> bb.setRoute(token, curve); bb.freeze(); after test epoch -> altar.freeze(); re.freeze() (from agent)");

  if (network.name !== "hardhat" && process.env.SKIP_VERIFY !== "1") {
    const verify = (address: string, constructorArguments: unknown[]) =>
      run("verify:verify", { address, constructorArguments }).catch((e: Error) => console.warn("verify:", e.message.split("\n")[0]));
    await verify(out.FOUNDER_SPLITTER_ADDRESS, [founderA, founderB]);
    await verify(out.ALTAR_ADDRESS, [deployer.address, agent, verifier, out.FOUNDER_SPLITTER_ADDRESS, firstEpoch, target]);
    await verify(out.REINCARNATOR_ADDRESS, [out.ALTAR_ADDRESS, forwarder, factory, pairToken, configId, taxBps, agent]);
    await verify(out.BUYBACK_ADDRESS, [out.ALTAR_ADDRESS, deployer.address]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
