import { spawn } from "node:child_process";
import readline from "node:readline";

const processes = [];
let shuttingDown = false;

function createYarnProcess(args, stdio) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "yarn", ...args], {
      cwd: process.cwd(),
      shell: false,
      stdio
    });
  }

  return spawn("yarn", args, {
    cwd: process.cwd(),
    shell: false,
    stdio
  });
}

function prefixStream(stream, prefix) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    if (line.trim().length > 0) {
      process.stdout.write(`${prefix} ${line}\n`);
    }
  });
}

function run(args, prefix) {
  const child = createYarnProcess(args, ["inherit", "pipe", "pipe"]);

  processes.push(child);
  prefixStream(child.stdout, prefix);
  prefixStream(child.stderr, prefix);

  child.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }

    if (code && code !== 0) {
      process.stderr.write(`${prefix} exited with code ${code}\n`);
      shutdown(1);
    }
  });

  return child;
}

function terminateChild(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false
    });
    return;
  }

  child.kill("SIGINT");
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of processes) {
    terminateChild(child);
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

const build = createYarnProcess(["workspace", "@swagfront/shared", "build"], "inherit");

build.on("exit", (code) => {
  if (code && code !== 0) {
    process.exit(code);
    return;
  }

  run(["workspace", "@swagfront/shared", "dev"], "[shared]");
  run(["workspace", "@swagfront/backend", "dev"], "[backend]");
  run(["workspace", "@swagfront/frontend", "dev"], "[frontend]");
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
