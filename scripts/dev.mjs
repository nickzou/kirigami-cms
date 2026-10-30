// Run `pnpm dev [site] [--port <n>]` to work on Kirigami against a site folder.
//
// It runs, in one terminal, everything that otherwise has to be remembered:
//   tsc    compiles the server and CLI to dist/ whenever src/ changes
//   admin  rebuilds the admin into dist/admin whenever admin/ changes
//   dev    runs `kirigami dev <site>`, and restarts it when the compiled code changes
// Edits to the site's pages and site.yaml are rebuilt by `kirigami dev` itself.
//
// With no site, it uses .dev-site/ (ignored by git), copied from the test
// fixture the first time, so trying things in the admin never changes the
// fixture the tests depend on.
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: pnpm dev [site] [--port <n>]

Watches and serves a site for working on Kirigami. With no site it uses
.dev-site/, a copy of the test fixture.`);
  process.exit(0);
}

// The site is the first argument that is neither a flag nor a flag's value;
// everything else goes to `kirigami dev`. (Only --port takes a value.)
let siteIndex = -1;
for (let i = 0; i < args.length && siteIndex === -1; i += 1) {
  if (args[i] === "--port") i += 1;
  else if (!args[i].startsWith("-")) siteIndex = i;
}
const site =
  siteIndex === -1 ? join(root, ".dev-site") : args.splice(siteIndex, 1)[0];
// Only to say where to open the admin; `kirigami dev` reads the flag itself.
const portArg = args.findIndex((arg) => arg.startsWith("--port"));
const port =
  portArg === -1
    ? 3000
    : Number(
        args[portArg].includes("=")
          ? args[portArg].split("=")[1]
          : args[portArg + 1],
      );

if (siteIndex === -1 && !existsSync(site)) {
  cpSync(join(root, "test/fixtures/basic-site"), site, { recursive: true });
  console.log("Made .dev-site/ from the test fixture (it is ignored by git).");
}

const colors = { tsc: 36, admin: 35, dev: 32 };
const children = [];
let stopping = false;

/** Starts a process in its own group, prefixing each line it prints. */
function run(label, command, commandArgs, onLine = () => {}) {
  const child = spawn(command, commandArgs, {
    cwd: root,
    detached: true, // its own group, so stopping takes its children with it
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  children.push(child);
  const tag = `\u001b[${colors[label]}m${label.padEnd(5)}\u001b[0m`;
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) => {
      console.log(`${tag} ${line}`);
      onLine(line);
    });
  }
  child.on("exit", (code, signal) => {
    if (stopping) return;
    console.log(
      `${tag} stopped (${signal ?? `exit ${code}`}). Stopping the rest.`,
    );
    stop(code ?? 1);
  });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
  // Give them a moment to close their servers, then leave.
  setTimeout(() => process.exit(code), 300);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

// The server needs the first compile and the first admin build to exist.
let compiled = false;
let built = false;
let started = false;
function startServerWhenReady() {
  if (started || !compiled || !built) return;
  started = true;
  console.log(
    `\nOpen http://localhost:${port}/admin/ (refresh after a change to the admin).\n`,
  );
  // --watch restarts it when any compiled file it uses changes.
  run("dev", process.execPath, [
    "--watch",
    "--watch-preserve-output",
    "dist/cli/main.js",
    "dev",
    site,
    ...args,
  ]);
}

const pnpm = (...rest) => ["exec", ...rest];
run(
  "tsc",
  "pnpm",
  pnpm("tsc", "-p", "tsconfig.build.json", "--watch", "--preserveWatchOutput"),
  (line) => {
    if (/Watching for file changes/.test(line)) {
      compiled = true;
      startServerWhenReady();
    }
  },
);
run("admin", "pnpm", pnpm("vite", "build", "--watch"), (line) => {
  if (/built in/.test(line)) {
    built = true;
    startServerWhenReady();
  }
});
