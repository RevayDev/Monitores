import { spawn } from 'node:child_process';

const run = (name, args) => {
  const child = spawn('npm', args, {
    cwd: process.cwd(),
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  return child;
};

const backend = run('backend', ['--prefix', 'backend', 'run', 'dev']);
const frontend = run('frontend', ['--prefix', 'frontend', 'run', 'dev']);

const shutdown = () => {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[backend] exited with code ${code}`);
    frontend.kill('SIGINT');
    process.exit(code);
  }
});

frontend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[frontend] exited with code ${code}`);
    backend.kill('SIGINT');
    process.exit(code);
  }
});
