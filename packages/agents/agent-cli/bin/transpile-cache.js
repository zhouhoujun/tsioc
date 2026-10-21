/**
 * @file Persistent transpile cache for the tsdi-agent CLI bootstrap.
 *
 * The CLI runs TypeScript sources through ts-node (SWC), so every start
 * re-transpiles the whole dependency graph (~3s on a warm machine). This hook
 * wraps the registered `.ts` loader and caches the compiled JavaScript on disk,
 * keyed by the source path, mtime, size, the tsconfig stamp and the loader
 * version. Cache hits skip transpilation entirely; any cache failure falls back
 * to the original loader so startup never breaks because of the cache.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const CACHE_VERSION = 'v1';

function cacheRoot() {
    const configured = String(process.env.TSDI_AGENT_TRANSPILE_CACHE_DIR || '').trim();
    if (configured) {
        return configured;
    }
    // Prefer the user-owned home directory: the cache is executable output, so
    // a world-writable temp directory would let another local user plant code.
    try {
        return path.join(os.homedir(), '.tsdi-agent', 'transpile-cache');
    } catch {
        return path.join(os.tmpdir(), 'tsdi-agent-transpile-cache');
    }
}

/** Drop a stale cache directory instead of letting it grow without bound. */
function prune(directory, limit = 4000) {
    try {
        const entries = fs.readdirSync(directory);
        if (entries.length <= limit) {
            return;
        }
        for (const entry of entries) {
            try { fs.rmSync(path.join(directory, entry), { force: true }); } catch { /* ignore */ }
        }
    } catch {
        // ignore
    }
}

function hash(value) {
    return crypto.createHash('sha1').update(value).digest('hex');
}

function fileStamp(file) {
    try {
        const stat = fs.statSync(file);
        return `${stat.mtimeMs}:${stat.size}`;
    } catch {
        return 'missing';
    }
}

/**
 * Install the cache around the current `.ts` require hook.
 *
 * @returns {boolean} true when the cache hook is installed.
 */
function install(options = {}) {
    if (process.env.TSDI_AGENT_TRANSPILE_CACHE === '0') {
        return false;
    }
    const loader = require.extensions['.ts'];
    if (typeof loader !== 'function' || loader.__tsdiCached) {
        return false;
    }
    const packageRoot = options.packageRoot || process.cwd();
    const tsconfig = options.tsconfig || path.join(packageRoot, 'tsconfig.json');
    const stamp = hash([
        CACHE_VERSION,
        process.version,
        fileStamp(tsconfig),
        packageRoot
    ].join('|'));
    const directory = path.join(cacheRoot(), CACHE_VERSION, stamp);
    try {
        fs.mkdirSync(directory, { recursive: true });
        prune(directory);
    } catch {
        return false;
    }

    const cached = function (module, filename) {
        const cacheFile = path.join(directory, `${hash(filename).slice(0, 24)}.js`);
        const sourceStamp = `${filename}|${fileStamp(filename)}|${stamp}`;
        const metaFile = `${cacheFile}.key`;
        try {
            if (fs.readFileSync(metaFile, 'utf8') === sourceStamp) {
                module._compile(fs.readFileSync(cacheFile, 'utf8'), filename);
                return;
            }
        } catch {
            // cache miss / unreadable — fall through to the loader
        }
        const compile = module._compile;
        let compiled;
        module._compile = function (code, file) {
            compiled = code;
            return compile.call(this, code, file);
        };
        try {
            loader(module, filename);
        } finally {
            module._compile = compile;
        }
        if (typeof compiled === 'string') {
            try {
                fs.writeFileSync(cacheFile, compiled);
                fs.writeFileSync(metaFile, sourceStamp);
            } catch {
                // never fail startup because the cache is not writable
            }
        }
    };
    cached.__tsdiCached = true;
    require.extensions['.ts'] = cached;
    return true;
}

module.exports = { install, CACHE_VERSION };
