import { Injectable, isNil, isString } from '@tsdi/ioc';
import { BadRequestException, ContentSendAdapter, FileAdapter, FileStats, ForbiddenException, MessageAdapter, SendOptions } from '@tsdi/common';
import { normalize, basename, parse, sep, isAbsolute } from 'node:path';

@Injectable({ static: true })
export class BrowserContentSendAdapter extends ContentSendAdapter {
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
        if (isAbsolute(path) || absPath.test(path)) {
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
        if (!adapter.hasHeader(fields.lastModified) && file.stats?.mtime) {
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
        if (opts.contentType && !adapter.hasHeader(fields.contentType)) {
            adapter.setHeader(fields.contentType, opts.contentType);
        }
        if (opts.disposition) {
            const dispositionName = basename(file.filename, file.encodingExt ?? '');
            adapter.setHeader(fields.disposition, this.createContentDisposition(dispositionName, opts.disposition));
        }
        if (file.stats?.size != null) {
            adapter.setHeader(fields.contentLength, file.stats.size as any);
        }
        if (opts.statusCode != null && typeof (adapter as any).setStatus === 'function') {
            (adapter as any).setStatus(opts.statusCode);
        }
        adapter.write((opts.method ?? 'GET').toUpperCase() === 'HEAD' ? null : fileAdapter.read(file.filename));
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
}

const absPath = /^[a-zA-Z]+:\//;
const UP_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const INDEX_REGEXP = /index(\.\w+)*$/;
