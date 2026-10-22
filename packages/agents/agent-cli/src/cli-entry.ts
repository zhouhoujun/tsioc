/**
 * Process entry shared by the source CLI (`bin/tsdi-agent.js`) and the bundled
 * CLI (`npm run bundle` → `bundle/tsdi-agent.cjs`).
 *
 * Only the process wiring belongs here: bootstrap concerns (ts-node / SWC
 * registration, bundle freshness) live in `bin/tsdi-agent.js`, and both paths
 * format fatal errors identically.
 */
import { createAgentCli, normalizeCliArgv } from './cli';
import { formatCliError, isCliDebugEnabled } from './cli-error-format';

const argv = normalizeCliArgv(process.argv);

Promise.resolve(createAgentCli().parseAsync(argv)).catch(error => {
    process.stderr.write(`${formatCliError(error, { debug: isCliDebugEnabled() })}\n`);
    process.exitCode = 1;
});
