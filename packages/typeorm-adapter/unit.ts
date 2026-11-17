// for unit test debug.

import { connect } from 'node:net';
import { runTest } from '@tsdi/unit';

/**
 * The adapter suites talk to a real PostgreSQL instance. Without one every
 * case fails with `ECONNREFUSED`, which hides the difference between "the
 * environment is missing a database" and "the adapter is broken".
 *
 * Default: skip the suites with an explicit notice (exit code 0) so the rest of
 * the repository gate stays usable. Set `REQUIRE_DB=1` (CI with a database
 * service) to turn a missing database into a failure.
 */
const HOST = process.env.PGHOST ?? 'localhost';
const PORT = Number(process.env.PGPORT ?? 5432);
const TIMEOUT_MS = 800;

function probeDatabase(): Promise<boolean> {
    return new Promise(resolve => {
        const socket = connect({ host: HOST, port: PORT });
        const finish = (available: boolean) => {
            socket.destroy();
            resolve(available);
        };
        socket.setTimeout(TIMEOUT_MS);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

probeDatabase()
    .then(available => {
        if (!available) {
            const notice = `[SKIP] PostgreSQL is not reachable at ${HOST}:${PORT} — ` +
                '@tsdi/typeorm-adapter integration suites were skipped. ' +
                'Start a database (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE) to run them, ' +
                'or set REQUIRE_DB=1 to make a missing database fail the run.';
            if (process.env.REQUIRE_DB === '1') {
                console.error(notice);
                process.exit(1);
            }
            console.warn(notice);
            return;
        }
        return runTest('./test/**/*.ts', { baseURL: __dirname });
    })
    .catch((err: Error) => {
        console.error(err);
        process.exit(1);
    });
