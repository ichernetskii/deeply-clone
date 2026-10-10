// Smoke test of the package: it's packed, installed with npm into a temporary project outside the repository
// and imported by its name, so the "exports" map is used like in a real project.
// Usage: node scripts/smoke.mjs [an already packed package.tgz]
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = fileURLToPath(new URL("..", import.meta.url));
const project = mkdtempSync(join(tmpdir(), "deeply-clone-smoke-"));
// without the hooks of Yarn Plug'n'Play: the package is resolved from node_modules
const env = { ...process.env, NODE_OPTIONS: "" };
const run = (command, args, cwd, stdio = "pipe") =>
	execFileSync(command, args, { cwd, env, stdio, shell: process.platform === "win32", encoding: "utf8" });

try {
	const [tarball] = process.argv.slice(2);
	if (tarball === undefined) {
		run("yarn", ["pack", "--out", join(project, "package.tgz")], root);
	} else {
		cpSync(tarball, join(project, "package.tgz"));
	}
	writeFileSync(join(project, "package.json"), JSON.stringify({ name: "smoke", private: true }));
	run("npm", ["install", "--no-audit", "--no-fund", "--no-package-lock", "--ignore-scripts", "./package.tgz"], project);
	for (const file of ["esm.test.mjs", "cjs.test.cjs"]) {
		cpSync(join(root, "test/smoke", file), join(project, file));
	}
	run(process.execPath, ["--test", "esm.test.mjs", "cjs.test.cjs"], project, "inherit");
} catch (error) {
	console.error(error.stdout ?? "", error.stderr ?? "");
	process.exitCode = 1;
} finally {
	rmSync(project, { recursive: true, force: true });
}
