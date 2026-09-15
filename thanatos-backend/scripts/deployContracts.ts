import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const agent = process.env.AGENT_PUBLIC_ADDRESS!;
  const dev = process.env.FOUNDER_PAYOUT_ADDRESS!;
  console.log("deployer", deployer.address);

  const altar = await ethers.deployContract("ThanatosAltar", [agent]);
  await altar.waitForDeployment();
  console.log("ALTAR_ADDRESS=", await altar.getAddress());

  const splitter = await ethers.deployContract("ThanatosFeeSplitter", [dev, await altar.getAddress(), agent]);
  await splitter.waitForDeployment();
  console.log("FEE_SPLITTER_ADDRESS=", await splitter.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
