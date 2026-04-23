/**
 * start-node.js — Tự động start Hardhat node + deploy + seed.
 *
 *  npm run node          → start node, tự deploy & seed nếu chain mới
 *  npm run node:reset    → xóa deployments/localhost.json → force re-deploy & re-seed
 *
 * Lưu ý: Hardhat 2.22.x không hỗ trợ hardhat_dumpState (persistent state).
 * Mỗi lần restart node, chain reset về block 0. Script này tự động
 * re-deploy + re-seed để marketplace luôn sẵn sàng dùng ngay.
 */

const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs   = require("fs");

const CWD             = path.join(__dirname, "..");
const DEPLOYMENT_FILE = path.join(CWD, "deployments/localhost.json");

// ─── RPC helper ───────────────────────────────────────────────────────────────

function rpc(method, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 });
    const req  = http.request(
      {
        hostname: "127.0.0.1", port: 8545, method: "POST",
        headers: { "Content-Type": "application/json",
                   "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end",  () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function waitForNode(retries = 90) {
  for (let i = 0; i < retries; i++) {
    try { await rpc("eth_blockNumber"); return true; } catch { /**/ }
    await new Promise((r) => setTimeout(r, 1000));
    process.stdout.write(".");
  }
  return false;
}

async function isDeployed(address) {
  const res = await rpc("eth_getCode", [address, "latest"]);
  return res.result && res.result !== "0x" && res.result.length > 4;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isReset = process.argv.includes("--reset");

  console.log("╔══════════════════════════════════════╗");
  console.log("║   NFT Marketplace — Local Node       ║");
  console.log("╚══════════════════════════════════════╝\n");

  // --reset: xóa deployment cũ để force re-deploy
  if (isReset && fs.existsSync(DEPLOYMENT_FILE)) {
    fs.unlinkSync(DEPLOYMENT_FILE);
    console.log("🗑️  Deployment file cleared — fresh deploy.\n");
  }

  // [1/3] Khởi động hardhat node
  console.log("[1/3] Starting Hardhat node...");
  const node = spawn("npx", ["hardhat", "node"], {
    stdio: "inherit",
    cwd:   CWD,
    shell: true,
  });
  node.on("error", (e) => { console.error("Hardhat error:", e); process.exit(1); });

  // [2/3] Chờ RPC sẵn sàng
  process.stdout.write("[2/3] Waiting for RPC");
  const ready = await waitForNode();
  console.log("");
  if (!ready) {
    console.error("ERROR: Hardhat node did not start in time.");
    node.kill();
    process.exit(1);
  }
  console.log("[2/3] Node ready!\n");

  // [3/3] Deploy + seed nếu chain mới (contracts chưa có)
  let needSetup = true;
  if (!isReset && fs.existsSync(DEPLOYMENT_FILE)) {
    const addrs = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf-8"));
    if (addrs.NFTCollection && await isDeployed(addrs.NFTCollection)) {
      console.log("[3/3] Contracts detected — skipping deploy & seed.");
      needSetup = false;
    }
  }

  if (needSetup) {
    console.log("[3/3] Fresh chain — deploying contracts...");
    execSync("npx hardhat run scripts/deploy.ts --network localhost", { cwd: CWD, stdio: "inherit" });
    console.log("\n[3/3] Seeding initial data...");
    execSync("npx hardhat run scripts/seed.ts --network localhost",   { cwd: CWD, stdio: "inherit" });
    console.log("\n[3/3] Setup complete!");
  }

  console.log("\n✅  Ready!  RPC → http://127.0.0.1:8545");
  console.log("    Ctrl+C để dừng.\n");
  console.log("    ⚠️  Lưu ý: Hardhat node là in-memory.");
  console.log("    NFT tự tạo sẽ mất khi restart — seed NFTs luôn được tạo lại.\n");

  // Forward signals
  const shutdown = () => { node.kill("SIGINT"); process.exit(0); };
  process.on("SIGINT",  shutdown);
  process.on("SIGTERM", shutdown);
  node.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((e) => { console.error(e); process.exit(1); });
