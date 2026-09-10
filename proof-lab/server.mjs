import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(root, ".proof-lab-build");
const config = path.join(root, "proof-lab", "tsconfig.json");

if (!existsSync(path.join(buildDir, "engine", "integrity.js"))) {
  execFileSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "tsc", "-p", config], { cwd: root, stdio: "inherit" });
}

const { evaluateIntegrity } = await import(pathToFileURL(path.join(buildDir, "engine", "integrity.js")).href);
const html = await readFile(path.join(root, "proof-lab", "index.html"), "utf8");

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(payload);
}

function normalizeEvidence(items = []) {
  return items
    .filter((item) => item && String(item.text || "").trim())
    .map((item, index) => ({
      id: `evidence-${index + 1}`,
      sourceId: `source-${index + 1}`,
      exactText: String(item.text).trim(),
      locator: String(item.locator || "").trim() || undefined,
    }));
}

function buildInput(body) {
  const items = Array.isArray(body.evidence) ? body.evidence : [];
  const evidence = normalizeEvidence(items);
  const sources = evidence.map((item, index) => ({
    id: item.sourceId,
    title: String(items[index]?.title || `Source ${index + 1}`).trim(),
    locator: String(items[index]?.locator || "").trim() || undefined,
    designation: items[index]?.designation === "PRIMARY" ? "PRIMARY" : "UNKNOWN",
  }));
  const evidenceLinks = evidence.map((item, index) => ({
    evidenceId: item.id,
    relationship: items[index]?.relationship === "CONTRARY" ? "CONTRARY" : "SUPPORTING",
  }));
  return {
    question: String(body.question || "").trim(),
    claim: { id: "claim-1", text: String(body.claim || "").trim() },
    sources,
    evidence,
    evidenceLinks,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    if (req.method === "POST" && req.url === "/api/check") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw || "{}");
      const input = buildInput(body);
      const finding = evaluateIntegrity(input);
      json(res, 200, { finding, input });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    json(res, 400, { error: error instanceof Error ? error.message : "Something went wrong." });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => {
  console.log(`Evidence Integrity Engine Proof Lab listening on ${port}`);
});
