# TMM TODA backend

Initial Node.js 24 LTS, TypeScript, and Fastify 5 scaffold. No application
routes are registered; requests, including `GET /`, receive Fastify's default
404 response. Ride APIs, Messenger webhooks, guard dashboard APIs, and dispatch
logic are outside this scaffold.

## Setup and commands

Use Node.js 24 (`nvm use` if using nvm) and npm.

```sh
npm ci
npm run dev
```

Development uses `tsx watch` and restarts on source changes. Stop it with Ctrl+C.
The watcher transpiles TypeScript; run the typecheck command to check types.

```sh
npm run typecheck
npm run build
npm start
```

The build emits JavaScript and source maps into `dist/`. Production starts with
`node dist/index.js`; it does not require a TypeScript runtime.

## Configuration

| Variable | Default | Requirement |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Nonempty hostname or address supported by Node.js |
| `PORT` | `3000` | Decimal integer from 1 to 65535 |

Supply variables through the shell or deployment environment. `.env` files are
not loaded automatically. Set `HOST=0.0.0.0` when external access is required.

```sh
HOST=127.0.0.1 PORT=3001 npm start
```

Startup emits structured JSON logs with the listening address. Invalid
configuration or a bind failure logs an error and exits with status 1.

## Smoke checks and shutdown

With the server running, expect HTTP 404:

```sh
curl -i http://127.0.0.1:3000/
```

To verify each signal against the compiled process, run the following once with
`TERM` and again with `INT` after building. Wait for the startup log before
sending the signal.

```sh
node dist/index.js &
server_pid=$!
```

After the startup log appears:

```sh
kill -TERM "$server_pid"
wait "$server_pid"
echo $?
```

Successful shutdown logs `Server closed`, releases the port, and exits with
status 0. SIGTERM and SIGINT share one cleanup operation, including when signals
repeat or arrive during startup. Cleanup waits for startup to settle and calls
Fastify's `close()` to drain requests and run close hooks. A shutdown error or
the 10-second deadline results in status 1. Startup failures retain status 1
after cleanup.

Also check that `PORT=invalid npm start` fails and that starting a second server
on an occupied port fails without stopping the first server.
