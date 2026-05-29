#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const port = process.argv[2] || '4300';

function killPort(port) {
  if (process.platform === 'win32') {
    let output;
    try {
      output = execSync(`netstat -ano`, { encoding: 'utf8' });
    } catch {
      return;
    }

    const pids = new Set();
    for (const line of output.split('\n')) {
      // Match lines like: TCP  0.0.0.0:4300  ...  LISTENING  1234
      const match = line.match(/\s+(?:TCP|UDP)\s+\S+:(\d+)\s+\S+\s+(?:LISTENING\s+)?(\d+)/i);
      if (match && match[1] === String(port)) {
        pids.add(match[2]);
      }
    }

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
