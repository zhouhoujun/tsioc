import * as fs from 'fs';
import * as path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

export type GatewayStaticResult = 'served' | 'missing' | 'forbidden';

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8'
};

export function gatewayContentType(filePath: string): string {
    return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/** Resolve a URL path inside a static root; null when it escapes the root. */
export function resolveGatewayStaticPath(rootDir: string, pathname: string): string | null {
    const root = path.resolve(rootDir);
    const decoded = decodeURIComponent(String(pathname || '/'));
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const resolved = path.resolve(root, relative);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        return null;
    }
    return resolved;
}

/**
 * Serve a GET/HEAD static asset (directory → index.html). The caller decides
 * how to answer `missing`/`forbidden` (keeping each gateway's error shape).
 */
export async function serveGatewayStaticFile(
    req: Pick<IncomingMessage, 'method'>,
    res: Pick<ServerResponse, 'writeHead' | 'end'>,
    rootDir: string,
    pathname: string
): Promise<GatewayStaticResult> {
    if (String(req.method || 'GET').toUpperCase() !== 'GET') {
        return 'missing';
    }
    const resolved = resolveGatewayStaticPath(rootDir, pathname);
    if (!resolved) {
        return 'forbidden';
    }
    let stat: fs.Stats;
    try {
        stat = await fs.promises.stat(resolved);
    } catch {
        return 'missing';
    }
    let filePath = resolved;
    if (stat.isDirectory()) {
        filePath = path.join(resolved, 'index.html');
        try {
            stat = await fs.promises.stat(filePath);
        } catch {
            return 'missing';
        }
    }
    if (!stat.isFile()) {
        return 'missing';
    }
    try {
        const content = await fs.promises.readFile(filePath);
        res.writeHead(200, {
            'Content-Type': gatewayContentType(filePath),
            'Content-Length': stat.size,
            'Cache-Control': 'no-cache'
        });
        res.end(content);
        return 'served';
    } catch {
        return 'missing';
    }
}
