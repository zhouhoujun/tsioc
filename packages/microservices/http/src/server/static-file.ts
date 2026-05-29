import { isAcceptsCapableMessageAdapter, isHeaderCapableMessageAdapter, isResponseStateCapableMessageAdapter, BadRequestException, ContentType, FileAdapter, FileStats, FindOptions, ForbiddenException, Header, HttpStatusCode, IStats, MimeAdapter, NotFoundException, Outgoing, OutgoingFactory, RequestContext } from '@tsdi/common'
import { REQUEST, RESPONSE } from '@tsdi/common';
import { basename } from 'node:path';
import { HttpFileResult, HttpFileResultOptions } from './file-result';

export interface HttpStaticOptions extends FindOptions {
    enabled?: boolean;
    setHeaders?: (outgoing: Outgoing, path: string, stats: IStats) => void;
    headers?: Record<string, Header>;
    disposition?: 'inline' | 'attachment';
}

interface ByteRange {
    start: number;
    end: number;
}

export function normalizeStaticOptions(options?: boolean | HttpStaticOptions | HttpStaticOptions[]): HttpStaticOptions[] {
    if (!options) {
        return [];
    }
    const values = options === true ? [{}] : Array.isArray(options) ? options : [options];
    return values.filter(value => value?.enabled !== false).map(value => ({ ...defaultStaticOptions, ...value }));
}

export async function resolveStaticFile(input: any, context: RequestContext, options: HttpStaticOptions[]): Promise<Outgoing<any> | null> {
    if (!options.length) {
        return null;
    }
    const method = String(input?.method ?? '').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
        return null;
    }
    const pathname = getPathname(input?.url ?? input?.pattern ?? input?.topic);
    if (!pathname) {
        return null;
    }

    const fileAdapter = context.get(FileAdapter);
    const adapter = context.getMessageAdapter();
    for (const option of options) {
        try {
            const file = await fileAdapter.find(pathname, {
                ...option,
                acceptsEncodings: (...encodings: string[]) => isAcceptsCapableMessageAdapter(adapter) ? adapter.acceptsEncodings(...encodings) : false,
            });
            if (file?.filename) {
                return createFileOutgoing(context, file, method, {
                    disposition: option.disposition,
                    headers: option.headers,
                    setHeaders: option.setHeaders,
                });
            }
        } catch (err) {
            throw normalizeFileError(err);
        }
    }
    return null;
}

export async function resolveFileResult(result: HttpFileResult, input: any, context: RequestContext): Promise<Outgoing<any>> {
    const method = String(input?.method ?? '').toUpperCase();
    if (typeof result.value === 'string') {
        const fileAdapter = context.get(FileAdapter);
        const filename = fileAdapter.isAbsolute(result.value) ? result.value : fileAdapter.resolve(result.value);
        if (!fileAdapter.existsSync(filename)) {
            throw new NotFoundException('Not Found', HttpStatusCode.NotFound);
        }
        return createFileOutgoing(context, {
            filename,
            stats: await fileStats(fileAdapter, filename),
        }, method, result.options);
    }

    const adapter = context.getMessageAdapter();
    const outgoing = context.get(RESPONSE);
    if (!outgoing) {
        throw new NotFoundException('Not Found', HttpStatusCode.NotFound);
    }
    applyResponseHeaders(outgoing, result.options.headers);
    if (result.options.statusCode) {
        outgoing.statusCode = result.options.statusCode;
    }
    const mimeAdapter = context.get(MimeAdapter);
    const contentType = result.options.contentType ?? inferContentType(mimeAdapter, result.options.filename);
    if (contentType && !outgoing.hasHeader('content-type')) {
        outgoing.setHeader('content-type', contentType);
    }
    if (result.options.filename) {
        outgoing.setHeader('content-disposition', createContentDisposition(result.options.filename, result.options.disposition ?? 'attachment'));
    }
    if (Buffer.isBuffer(result.value)) {
        outgoing.setHeader('content-length', result.value.length);
    }
    outgoing.statusCode ||= HttpStatusCode.Ok;
    outgoing.body = method === 'HEAD' ? null : result.value;
    return outgoing;
}

export function isHttpFileResult(value: any): value is HttpFileResult {
    return value instanceof HttpFileResult;
}

function createFileOutgoing(context: RequestContext, file: FileStats<IStats>, method: string, options: HttpFileResultOptions & { setHeaders?: (outgoing: Outgoing, path: string, stats: IStats) => void } = {}): Outgoing<any> {
    const outgoing = context.get(OutgoingFactory).create({});
    const mimeAdapter = context.get(MimeAdapter);
    const fileAdapter = context.get(FileAdapter);
    const size = Number(file.stats.size ?? 0);
    const range = parseRange(getHeader(context, 'range'), size);

    applyResponseHeaders(outgoing, options.headers);
    options.setHeaders?.(outgoing, file.filename, file.stats);
    if (!outgoing.hasHeader('last-modified')) {
        outgoing.setHeader('last-modified', file.stats.mtime.toUTCString());
    }
    if (!outgoing.hasHeader('cache-control')) {
        outgoing.setHeader('cache-control', 'max-age=0');
    }
    if (!outgoing.hasHeader('accept-ranges')) {
        outgoing.setHeader('accept-ranges', 'bytes');
    }
    if (!outgoing.hasHeader('content-type')) {
        outgoing.setHeader('content-type', options.contentType ?? inferContentType(mimeAdapter, file.filename, file.encodingExt));
    }
    if (file.encodingExt && !outgoing.hasHeader('content-encoding')) {
        outgoing.setHeader('content-encoding', getContentEncoding(file.encodingExt));
    }

    const dispositionName = options.filename ?? basename(file.filename, file.encodingExt ?? '');
    if (options.disposition && dispositionName) {
        outgoing.setHeader('content-disposition', createContentDisposition(dispositionName, options.disposition));
    }

    if (range) {
        outgoing.statusCode = HttpStatusCode.PartialContent;
        outgoing.setHeader('content-range', `bytes ${range.start}-${range.end}/${size}`);
        outgoing.setHeader('content-length', range.end - range.start + 1);
        outgoing.body = method === 'HEAD' ? null : fileAdapter.read(file.filename, { start: range.start, end: range.end });
        return outgoing;
    }

    outgoing.statusCode = options.statusCode ?? HttpStatusCode.Ok;
    outgoing.setHeader('content-length', size);
    outgoing.body = method === 'HEAD' ? null : fileAdapter.read(file.filename);
    return outgoing;
}

function inferContentType(mimeAdapter: MimeAdapter | null | undefined, filename?: string, encodingExt?: string): string {
    const name = filename ?? '';
    const lookupName = encodingExt ? name.slice(0, -encodingExt.length) : name;
    const contentType = lookupName && mimeAdapter?.lookup(lookupName);
    return contentType || ContentType.OCTET_STREAM;
}

function getHeader(context: RequestContext, name: string): string | undefined {
    const request = context.get(REQUEST);
    const value = typeof request?.getHeader === 'function'
        ? request.getHeader(name)
        : request?.headers?.[name.toLowerCase()] ?? request?.headers?.[name];
    if (Array.isArray(value)) {
        return value.length ? String(value[0]) : undefined;
    }
    return value == null ? undefined : String(value);
}

function getPathname(path?: string): string {
    if (!path) {
        return '';
    }
    const queryIndex = path.indexOf('?');
    return queryIndex >= 0 ? path.slice(0, queryIndex) : path;
}

function parseRange(header: string | undefined, size: number): ByteRange | null {
    if (!header) {
        return null;
    }
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match) {
        throw new BadRequestException('Invalid Range header', HttpStatusCode.RangeNotSatisfiable);
    }
    let start: number;
    let end: number;
    if (!match[1] && !match[2]) {
        throw new BadRequestException('Invalid Range header', HttpStatusCode.RangeNotSatisfiable);
    }
    if (!match[1]) {
        const suffix = Number(match[2]);
        if (!Number.isFinite(suffix) || suffix <= 0) {
            throw new BadRequestException('Invalid Range header', HttpStatusCode.RangeNotSatisfiable);
        }
        start = Math.max(size - suffix, 0);
        end = size - 1;
    } else {
        start = Number(match[1]);
        end = match[2] ? Number(match[2]) : size - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
        const error = new BadRequestException('Requested range not satisfiable', HttpStatusCode.RangeNotSatisfiable);
        (error as any).headers = { 'content-range': `bytes */${size}` };
        throw error;
    }
    return { start, end: Math.min(end, size - 1) };
}

function applyResponseHeaders(outgoing: Outgoing, headers?: Record<string, Header>) {
    if (!headers) {
        return;
    }
    Object.entries(headers).forEach(([name, value]) => outgoing.setHeader(name, value));
}

function getContentEncoding(ext?: string): string | undefined {
    switch (ext) {
        case '.br':
            return 'br';
        case '.gz':
            return 'gzip';
        default:
            return undefined;
    }
}

function createContentDisposition(filename: string, disposition: 'inline' | 'attachment'): string {
    const fallback = filename.replace(/[\r\n"]/g, '_');
    const encoded = encodeURIComponent(filename);
    return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

async function fileStats(fileAdapter: FileAdapter, filename: string): Promise<IStats> {
    const file = await fileAdapter.find(filename, { root: '/', index: false, format: false, hidden: true });
    if (!file?.stats) {
        throw new NotFoundException('Not Found', HttpStatusCode.NotFound);
    }
    return file.stats;
}

function normalizeFileError(err: any) {
    if (err instanceof BadRequestException && !err.statusCode) {
        return new BadRequestException(err.message, HttpStatusCode.BadRequest);
    }
    if (err instanceof ForbiddenException && !err.statusCode) {
        return new ForbiddenException(err.message, HttpStatusCode.Forbidden);
    }
    if (err instanceof NotFoundException && !err.statusCode) {
        return new NotFoundException(err.message, HttpStatusCode.NotFound);
    }
    return err;
}

const defaultStaticOptions: HttpStaticOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    hidden: false,
    immutable: false,
};
