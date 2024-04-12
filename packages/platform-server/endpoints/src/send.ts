import { PROCESS_ROOT } from '@tsdi/core';
import { Injectable, isArray, isBoolean, isNil, isString, TypeExecption } from '@tsdi/ioc';
import { BadRequestExecption, ENAMETOOLONG, ENOENT, ENOTDIR, ForbiddenExecption, InternalServerExecption, NotFoundExecption } from '@tsdi/common/transport';
import { RequestContext, ContentSendAdapter, SendOptions } from '@tsdi/endpoints';
import { normalize, resolve, basename, extname, parse, sep, isAbsolute, join } from 'path';
import { existsSync, Stats, stat, createReadStream } from 'fs';
import { promisify } from 'util';

const statify = promisify(stat);

@Injectable({ static: true })
export class ContentSendAdapterImpl extends ContentSendAdapter {
    async send(ctx: RequestContext, path: string, opts: SendOptions): Promise<string> {
        if (isNil(path) || !isString(path)) return '';

        if (path.startsWith('/')) {
            path = path.substring(1);
        }
        if (opts.prefix) {
            const prefix = path.startsWith('/') ? opts.prefix.substring(1) : opts.prefix;
            if (!path.startsWith(prefix)) return '';
            path = path.slice(prefix.length);
        }
        const endSlash = path[path.length - 1] === '/';
        path = path.substring(parse(path).root.length);
        const roots = isArray(opts.root) ? opts.root : [opts.root];
        try {
            path = decodeURIComponent(path)
        } catch {
            throw new BadRequestExecption('failed to decode url');
        }
        let index = opts.index;
        if (index && isBoolean(index)) {
            index = 'index.html';
        }
        if (index && endSlash) path += index;
        const baseUrl = ctx.get(PROCESS_ROOT);
        if (isAbsolute(path) || winAbsPath.test(path)) {
            throw new BadRequestExecption('Malicious Path');
        }
        if (UP_REGEXP.test(normalize('.' + sep + path))) {
            throw new ForbiddenExecption();
        }
        let filename = '', encodingExt = '';
        roots.some(root => {
            const rpath = isString(opts.baseUrl) ? this.resolvePath(opts.baseUrl, root, path!) : (opts.baseUrl === false) ? this.resolvePath(root, path!) : this.resolvePath(baseUrl, root, path!);
            if (!opts.hidden && isHidden(root, rpath)) return false;
            // serve brotli file when possible otherwise gzipped file when possible
            if (ctx.acceptsEncodings('br', 'identity') === 'br' && opts.brotli && existsSync(rpath + '.br')) {
                filename = rpath + '.br';
                encodingExt = '.br';
                ctx.contentEncoding = 'br';
            } else if (ctx.acceptsEncodings('gzip', 'identity') === 'gzip' && opts.gzip && existsSync(rpath + '.gz')) {
                filename = rpath + '.gz';
                encodingExt = '.gz';
                ctx.contentEncoding = 'gzip';
            } else if (existsSync(rpath)) {
                filename = rpath
            } else if (opts.extensions && !/\./.exec(basename(rpath))) {
                const list = [...opts.extensions]
                for (let i = 0; i < list.length; i++) {
                    let ext = list[i]
                    if (typeof ext !== 'string') {
                        throw new TypeExecption('option extensions must be array of strings or false')
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
                throw new NotFoundExecption((err as Error).message)
            }
            throw new InternalServerExecption()
        }

        if (opts.setHeaders) opts.setHeaders(ctx, filename, stats);

        ctx.length = stats.size;
        if (ctx.response.tHeaders && !ctx.response.tHeaders.getLastModified()) ctx.response.tHeaders.setLastModified(stats.mtime.toUTCString())
        if (ctx.response.tHeaders && !ctx.response.tHeaders.getCacheControl()) {
            const maxAge = opts.maxAge ?? 0;
            const directives = [`max-age=${(maxAge / 1000 | 0)}`];
            if (opts.immutable) {
                directives.push('immutable')
            }
            ctx.response.tHeaders.setCacheControl(directives.join(','))
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

const notfound = [ENOENT, ENAMETOOLONG, ENOTDIR];
const winAbsPath = /^[a-zA-Z]+:\//;
const UP_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
