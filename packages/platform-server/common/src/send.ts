import { Injectable, isNil, isString } from '@tsdi/ioc';
import { BadRequestException, ContentSendAdapter, FileAdapter, FileStats, ForbiddenException, MessageAdapter, SendOptions } from '@tsdi/common';
import { normalize, basename, parse, sep, isAbsolute } from 'node:path';

@Injectable({ static: true })
export class ContentSendAdapterImpl extends ContentSendAdapter {
    async send(adapter: MessageAdapter, fileAdapter: FileAdapter, path: string, opts: SendOptions = {}): Promise<FileStats<any> | null> {
        if (isNil(path) || !isString(path)) return null;

        const fields = {
            cacheControl: 'cache-control',
            contentEncoding: 'content-encoding',
            contentLength: 'content-length',
            contentType: 'content-type',
            disposition: 'content-disposition',
            lastModified: 'last-modified',
            acceptRanges: 'accept-ranges',
            range: 'range',
            contentRange: 'content-range',
            ...opts.fields,
        };

        if (path.startsWith('/')) {
            path = path.substring(1);
        }
        if (opts.prefix) {
            const prefix = path.startsWith('/') ? opts.prefix.substring(1) : opts.prefix;
            if (!path.startsWith(prefix)) return null;
            path = path.slice(prefix.length);
        }
        const endSlash = path[path.length - 1] === '/';
        path = path.substring(parse(path).root.length);
        try {
            path = decodeURIComponent(path)
        } catch {
            throw new BadRequestException('failed to decode url');
        }
        const index = opts.index;
        if (!index && INDEX_REGEXP.test(path)) {
            return null;
        }
        if (isString(index) && endSlash) path += index;
        if (isAbsolute(path) || winAbsPath.test(path)) {
            throw new BadRequestException('Malicious Path');
        }
        if (UP_REGEXP.test(normalize('.' + sep + path))) {
            throw new ForbiddenException();
        }

        const file = await fileAdapter.find(path, opts);
        if (!file?.stats) {
            return null;
        }

        if (opts.setHeaders) {
            opts.setHeaders(adapter, file.filename, file.stats);
        }
        if (file.encodingExt && !adapter.hasHeader(fields.contentEncoding)) {
            adapter.setHeader(fields.contentEncoding, this.getContentEncoding(file.encodingExt));
        }
        if (!adapter.hasHeader(fields.lastModified)) {
            adapter.setHeader(fields.lastModified, file.stats.mtime.toUTCString());
        }
        if (!adapter.hasHeader(fields.cacheControl)) {
            const maxAge = opts.maxAge ?? 0;
            const directives = [`max-age=${(maxAge / 1000 | 0)}`];
            if (opts.immutable) {
                directives.push('immutable');
            }
            adapter.setHeader(fields.cacheControl, directives.join(','));
        }
        if (!adapter.hasHeader(fields.acceptRanges)) {
            adapter.setHeader(fields.acceptRanges, 'bytes');
        }
        const contentType = opts.contentType ?? this.inferContentType(fileAdapter, file.filename, file.encodingExt);
        if (contentType && !adapter.hasHeader(fields.contentType)) {
            adapter.setHeader(fields.contentType, contentType);
        }
        if (opts.disposition) {
            const dispositionName = basename(file.filename, file.encodingExt ?? '');
            adapter.setHeader(fields.disposition, this.createContentDisposition(dispositionName, opts.disposition));
        }

        const size = Number(file.stats.size ?? 0);
        const rangeHeader = typeof adapter.getHeader === 'function' ? adapter.getHeader(fields.range) : undefined;
        const range = this.parseRange(typeof rangeHeader === 'string' ? rangeHeader : undefined, size);

        if (range) {
            if (typeof (adapter as any).setStatus === 'function') {
                (adapter as any).setStatus(206);
            }
            adapter.setHeader(fields.contentRange, `bytes ${range.start}-${range.end}/${size}`);
            adapter.setHeader(fields.contentLength, range.end - range.start + 1);
            adapter.setPayload((opts.method ?? 'GET').toUpperCase() === 'HEAD' ? null : fileAdapter.read(file.filename, { start: range.start, end: range.end }));
        } else {
            adapter.setHeader(fields.contentLength, size);
            if (opts.statusCode != null && typeof (adapter as any).setStatus === 'function') {
                (adapter as any).setStatus(opts.statusCode);
            }
            adapter.setPayload((opts.method ?? 'GET').toUpperCase() === 'HEAD' ? null : fileAdapter.read(file.filename));
        }
        return file;
    }

    private createContentDisposition(filename: string, disposition: 'inline' | 'attachment'): string {
        const fallback = filename.replace(/[\r\n"]/g, '_');
        const encoded = encodeURIComponent(filename);
        return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
    }

    private getContentEncoding(ext?: string): string | undefined {
        switch (ext) {
            case '.br':
                return 'br';
            case '.gz':
                return 'gzip';
            default:
                return undefined;
        }
    }

    private inferContentType(fileAdapter: FileAdapter, filename: string, encodingExt?: string): string {
        const ext = fileAdapter.extname(filename, encodingExt).toLowerCase();
        switch (ext) {
            case '.html':
            case '.htm':
                return 'text/html';
            case '.txt':
                return 'text/plain';
            case '.json':
                return 'application/json';
            case '.js':
                return 'application/javascript';
            case '.css':
                return 'text/css';
            case '.xml':
                return 'application/xml';
            case '.svg':
                return 'image/svg+xml';
            case '.png':
                return 'image/png';
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.gif':
                return 'image/gif';
            case '.mp4':
                return 'video/mp4';
            default:
                return 'application/octet-stream';
        }
    }

    private parseRange(header: string | undefined, size: number): { start: number; end: number } | null {
        if (!header) {
            return null;
        }
        const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
        if (!match) {
            throw new BadRequestException('Invalid Range header', 416);
        }
        let start: number;
        let end: number;
        if (!match[1] && !match[2]) {
            throw new BadRequestException('Invalid Range header', 416);
        }
        if (!match[1]) {
            const suffix = Number(match[2]);
            if (!Number.isFinite(suffix) || suffix <= 0) {
                throw new BadRequestException('Invalid Range header', 416);
            }
            start = Math.max(size - suffix, 0);
            end = size - 1;
        } else {
            start = Number(match[1]);
            end = match[2] ? Number(match[2]) : size - 1;
        }
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
            const error = new BadRequestException('Requested range not satisfiable', 416) as any;
            error.headers = { 'content-range': `bytes */${size}` };
            throw error;
        }
        return { start, end: Math.min(end, size - 1) };
    }
}

const winAbsPath = /^[a-zA-Z]+:\//;
const UP_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const INDEX_REGEXP = /index(\.\w+)*$/;
