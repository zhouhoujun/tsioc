/**
 * Decide whether the pre-bundled CLI can be used.
 *
 * The bundle is an optimisation only: every failure path returns the source
 * mode, so a missing, stale or malformed bundle can never break the CLI. The
 * manifest records (mtime, size) for every source that fed the build, so an
 * edited source automatically falls back until `npm run bundle` runs again.
 *
 * Environment:
 *   TSDI_AGENT_BUNDLE=0|off   force the source path
 *   TSDI_AGENT_BUNDLE=1|on    require the bundle; throws when unusable
 *   TSDI_AGENT_BUNDLE_LOG=1   print the decision to stderr
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BUNDLE_VERSION = 1;

function requestedMode() {
    const raw = String(process.env.TSDI_AGENT_BUNDLE || '').trim().toLowerCase();
    if (raw === '0' || raw === 'off' || raw === 'false') {
        return 'off';
    }
    if (raw === '1' || raw === 'on' || raw === 'true') {
        return 'force';
    }
    return 'auto';
}

/**
 * @param {{ packageRoot?: string }} [options]
 * @returns {{ mode: 'bundle' | 'source', file: string, reason: string, inputs?: number }}
 */
function resolveBundleState(options) {
    const packageRoot = (options && options.packageRoot) || path.join(__dirname, '..');
    const bundleFile = path.join(packageRoot, 'bundle', 'tsdi-agent.cjs');
    const manifestFile = path.join(packageRoot, 'bundle', 'manifest.json');
    const want = requestedMode();
    const source = reason => ({ mode: 'source', file: bundleFile, reason });

    if (want === 'off') {
        return source('disabled by TSDI_AGENT_BUNDLE');
    }

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch {
        return source('missing or unreadable manifest');
    }
    if (!manifest || manifest.version !== BUNDLE_VERSION) {
        return source('manifest version mismatch');
    }
    if (!Array.isArray(manifest.inputs) || manifest.inputs.length === 0) {
        return source('manifest has no inputs');
    }
    try {
        fs.statSync(bundleFile);
    } catch {
        return source('missing bundle');
    }

    for (const input of manifest.inputs) {
        if (!input || typeof input.file !== 'string') {
            return source('malformed manifest entry');
        }
        const file = path.join(packageRoot, input.file);
        let info;
        try {
            info = fs.statSync(file);
        } catch {
            return source(`stale: missing ${input.file}`);
        }
        if (info.mtimeMs !== input.mtimeMs || info.size !== input.size) {
            return source(`stale: ${input.file}`);
        }
    }

    return { mode: 'bundle', file: bundleFile, reason: 'fresh', inputs: manifest.inputs.length };
}

/**
 * Resolve the bundle and honour the explicit `TSDI_AGENT_BUNDLE=1` contract.
 *
 * @param {{ packageRoot?: string }} [options]
 */
function resolveBundle(options) {
    const state = resolveBundleState(options);
    if (requestedMode() === 'force' && state.mode !== 'bundle') {
        throw new Error(`TSDI_AGENT_BUNDLE=1 but the CLI bundle is unusable (${state.reason}); run \`npm run bundle\` in @tsdi/agent-cli.`);
    }
    if (String(process.env.TSDI_AGENT_BUNDLE_LOG || '').trim() === '1') {
        process.stderr.write(`[bundle] ${state.mode} (${state.reason})\n`);
    }
    return state;
}

module.exports = { BUNDLE_VERSION, requestedMode, resolveBundleState, resolveBundle };
