import { buildApp } from './app.js';

const app = buildApp();
const shutdownTimeoutMs = 10_000;
let shuttingDown = false;
let shutdownPromise: Promise<void> | undefined;

function readConfig() {
  const host = process.env.HOST ?? '127.0.0.1';
  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);

  if (host.trim().length === 0) {
    throw new Error('HOST must be nonempty');
  }
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }

  return { host, port };
}

function shutdown(reason: string): Promise<void> {
  if (shutdownPromise) return shutdownPromise;

  shuttingDown = true;
  app.log.info({ reason }, 'Shutting down');
  const timeout = setTimeout(() => {
    app.log.error('Shutdown timed out after 10 seconds');
    process.exit(1);
  }, shutdownTimeoutMs);

  shutdownPromise = (async () => {
    try {
      // Let an in-progress listen settle before closing, so it cannot reopen
      // the server after shutdown has completed.
      await startup;
      await app.close();
      app.log.info('Server closed');
    } catch (error) {
      app.log.error({ err: error }, 'Shutdown failed');
      process.exit(1);
    } finally {
      clearTimeout(timeout);
    }
  })();

  return shutdownPromise;
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });

// Defer startup until signal handlers and lifecycle state are initialized.
const startup = Promise.resolve().then(async () => {
  try {
    const config = readConfig();
    if (shuttingDown) return;
    const address = await app.listen(config);
    if (!shuttingDown) app.log.info({ address }, 'Application started');
  } catch (error) {
    app.log.error({ err: error }, 'Startup failed');
    process.exitCode = 1;
  }
});

void startup.then(() => {
  if (process.exitCode === 1) return shutdown('startup failure');
});
