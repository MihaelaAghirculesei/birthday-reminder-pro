#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const port = process.argv[2] || '4300';

// Synchronous sleep — safe on Node.js main thread.
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Parse local-address column only — locale-independent (no state-name check).
// netstat columns: Proto  LocalAddress  ForeignAddress  State  PID
// Works for English ("LISTENING"), German ("ABHÖREN"), French ("ÉCOUTE"), etc.
function getPidsOnPort(port) {
  const pids = new Set();
  let output;
  try {
    output = execSync('netstat -ano', { encoding: 'utf8' });
  } catch {
    return pids;
  }
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    // cols: [Proto, LocalAddr, ForeignAddr, State, PID]
    if ((cols[0] === 'TCP' || cols[0] === 'UDP') && cols.length >= 5) {
      const localAddr = cols[1]; // e.g. "0.0.0.0:4300" or "[::]:4300"
      if (localAddr.endsWith(':' + port)) {
        const pid = cols[4];
        if (pid && pid !== '0') pids.add(pid);
      }
    }
  }
  return pids;
}

function isPortFree(port) {
  return getPidsOnPort(port).size === 0;
}

function killPort(port) {
  if (process.platform === 'win32') {
    const pids = getPidsOnPort(port);
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        console.log(`Killed PID ${pid} on port ${port}`);
      } catch {
        // already gone
      }
    }
  } else {
    try {
      execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: 'ignore', shell: true });
    } catch {
      // nothing listening
    }
  }
}

killPort(port);

// Wait up to 5 s for the OS to actually release the port after the kill.
const deadline = Date.now() + 5000;
while (!isPortFree(port) && Date.now() < deadline) {
  sleep(200);
}
