#!/usr/bin/env node
// Script to run electron-vite commands with clean environment
// Usage: node scripts/run-electron-vite.js <command>

const { spawn } = require('child_process');
const path = require('path');

// Remove the problematic env variable that VS Code sets
delete process.env.ELECTRON_RUN_AS_NODE;

const command = process.argv[2] || 'dev';
const electronVite = path.join(__dirname, '..', 'node_modules', '.bin', 'electron-vite');
const ext = process.platform === 'win32' ? '.cmd' : '';

const child = spawn(electronVite + ext, [command], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
  cwd: path.join(__dirname, '..')
});

child.on('close', (code) => {
  process.exit(code || 0);
});
