#!/usr/bin/env node
const { spawn } = require("node:child_process");

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const processes = [];
let shuttingDown = false;

const commands = [
  { name: "next", args: ["run", "dev"] },
  { name: "go", args: ["run", "go:dev"] },
];

function log(name, message) {
  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[dev:full][${name}][${timestamp}] ${message}`);
}

function startCommand(command) {
  log(command.name, `starting "${pnpmCommand} ${command.args.join(" ")}"`);
  const child = spawn(pnpmCommand, command.args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    log(
      command.name,
      `exited with ${signal ? `signal ${signal}` : `code ${code ?? 0}`}`,
    );
    if (!shuttingDown) {
      shuttingDown = true;
      cleanExit(typeof code === "number" ? code : 1);
    }
  });

  processes.push({ name: command.name, child });
}

function cleanExit(code = 0) {
  processes.forEach(({ child, name }) => {
    if (!child.killed) {
      log(name, "stopping");
      child.kill("SIGINT");
    }
  });

  setTimeout(() => {
    process.exit(code);
  }, 200);
}

commands.forEach(startCommand);

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    if (!shuttingDown) {
      shuttingDown = true;
      log("dev:full", `received ${signal}, cleaning up...`);
      cleanExit(0);
    }
  });
});
