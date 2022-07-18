import { BadRequestError, ForbiddenError, InternalServerError, NotFoundError, PROCESS_ROOT } from '@tsdi/core';
import { Injectable, isArray } from '@tsdi/ioc';
import { normalize, resolve, basename, extname, parse, sep, isAbsolute, join } from 'path';
import { existsSync, Stats, stat, createReadStream } from 'fs';
import { promisify } from 'util';
import { ContentSendAdapter, SendOptions } from '../middlewares/send';
import { ev, hdr } from '../consts';
import { AssetServerContext } from '../asset.ctx';


const statify = promisify(stat);

@Injectable()
export class TransportSendAdapter extends ContentSendAdapter {
    async send(ctx: AssetServerContext, opts: SendOptions): Promise<string> {
        let path = ctx.pathname;
        const endSlash = path[path.length - 1] === '/';
        path = path.substring(parse(path).root.length);
        const roots = isArray(opts.root) ? opts.root : [opts.root];
        try {
            path = decodeURIComponent(path)
        } catch {
            throw new BadRequestError('failed to decode url');
        }
        const index = opts.index;
        if (index && endSlash) path += index;
        const baseUrl = ctx.get(PROCESS_ROOT);
        if (isAbsolute(path) || winAbsPath.test(path)) {
            throw new BadRequestError('Malicious Path');
        }
        if (UP_REGEXP.test(normalize('.' + sep + path))) {
            throw new ForbiddenError();
        }
        let filename = '', encodingExt = '';
        roots.some(root => {
            const rpath = this.resolvePath(baseUrl, root, path);
            if (!opts.hidden && isHidden(root, rpath)) return false;
            // serve brotli file when possible otherwise gzipped file when possible
            if (ctx.acceptsEncodings('br', 'identity') === 'br' && opts.brotli && existsSync(rpath + '.br')) {
                filename = rpath + '.br';
                encodingExt = '.br';
                ctx.setHeader(hdr.CONTENT_ENCODING, 'br');
                ctx.removeHeader(hdr.CONTENT_LENGTH)
            } else if (ctx.acceptsEncodings('gzip', 'identity') === 'gzip' && opts.gzip && existsSync(rpath + '.gz')) {
                filename = rpath + '.gz';
                encodingExt = '.gz';
                ctx.setHeader(hdr.CONTENT_ENCODING, 'gzip');
                ctx.removeHeader(hdr.CONTENT_LENGTH)
            } else if (existsSync(rpath)) {
                filename = rpath
            } else if (opts.extensions && !/\./.exec(basename(rpath))) {
                const list = [...opts.extensions]
                for (let i = 0; i < list.length; i++) {
                    let ext = list[i]
                    if (typeof ext !== 'string') {
                        throw new TypeError('option extensions must be array of strings or false')
                    }
                    if (!/^\./.exec(ext)) ext = `.${ext}`;
                    if (existsSync(`${rpath}${ext}`)) {
                        filename = `${rpath}${ext}`;
                        break
                    }
                }
            }
            return !!filename
        });
        if (!filename) return filename;
        // stat
        let stats: Stats;
        try {
            stats = await statify(filename);
            // Format the path to serve static file servers
            // and not require a trailing slash for directories,
            // so that you can do both `/directory` and `/directory/`
            if (stats.isDirectory()) {
                if (opts.format && index) {
                    path += `/${index}`;
                    stats = await statify(filename)
                } else {
                    return ''
                }
            }
        } catch (err) {
            if (notfound.includes((err as any).code)) {
                throw new NotFoundError((err as Error).message)
            }
            throw new InternalServerError()
        }

        if (opts.setHeaders) opts.setHeaders(ctx, filename, stats);

        const maxAge = opts.maxAge ?? 0;
        ctx.setHeader(hdr.CONTENT_LENGTH, stats.size);
        if (!ctx.response.getHeader(hdr.LAST_MODIFIED)) ctx.setHeader(hdr.LAST_MODIFIED, stats.mtime.toUTCString())
        if (!ctx.response.getHeader(hdr.CACHE_CONTROL)) {
            const directives = [`max-age=${(maxAge / 1000 | 0)}`];
            if (opts.immutable) {
                directives.push('immutable')
            }
            ctx.setHeader(hdr.CACHE_CONTROL, directives.join(','))
        }
        if (!ctx.type) ctx.type = this.getExtname(filename, encodingExt);
        ctx.body = createReadStream(filename);

        return filename
    }

    private getExtname(file: string, ext?: string) {
        return ext ? extname(basename(file, ext)) : extname(file)

    }

    private resolvePath(root: string, ...path: string[]): string {
        return normalize(join(resolve(root), ...path))
    }
}

function isHidden(root: string, path: string) {
    const paths = path.substring(root.length).split(sep)
    for (let i = 0; i < paths.length; i++) {
        if (paths[i][0] === '.') return true
    }
    return false
}

const notfound = [ev.ENOENT, ev.ENAMETOOLONG, ev.ENOTDIR];
const winAbsPath = /^[a-zA-Z]+:\//;
const UP_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/