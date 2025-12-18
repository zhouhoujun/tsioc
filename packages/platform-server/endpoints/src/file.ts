import { Injectable, isArray, isNil, isString, TypeException } from '@tsdi/ioc';
import { BadRequestException, ENAMETOOLONG, ENOENT, ENOTDIR, FileAdapter, FileStats, FindOptions, ForbiddenException, InternalServerException, IReadable, IStats, NotFoundException } from '@tsdi/common';
import { isAbsolute, resolve, join, normalize, extname, basename, parse, sep } from 'node:path';
import { existsSync, createReadStream, Stats } from 'node:fs';
import { stat } from 'node:fs/promises';



@Injectable()
export class NodeFileAdapter extends FileAdapter {

    isAbsolute(path: string): boolean {
        return isAbsolute(path)
    }
    normalize(path: string): string {
        return normalize(path)
    }
    join(...paths: string[]): string {
        return join(...paths)
    }
    resolve(...paths: string[]): string {
        return resolve(...paths)
    }
    extname(path: string, zipExt?: string | undefined): string {
        return zipExt ? extname(basename(path, zipExt)) : extname(path)
    }
    existsSync(path: string): boolean {
        return existsSync(path)
    }

    read(path: string, options?: any): IReadable {
        return createReadStream(path, options)
    }

    async find<T extends IStats>(path: string, opts: FindOptions): Promise<FileStats<T> | null> {
        if (isNil(path) || !isString(path)) return null;

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
        const roots = isArray(opts.root) ? opts.root : [opts.root ?? 'public'];
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
        // const baseUrl = opts.baseUrl;
        if (isAbsolute(path) || winAbsPath.test(path)) {
            throw new BadRequestException('Malicious Path');
        }
        if (UP_REGEXP.test(normalize('.' + sep + path))) {
            throw new ForbiddenException();
        }
        let filename = '', encodingExt = '', contentEncoding: string;
        roots.some(root => {
            const rpath = isString(opts.baseUrl) ? this.joinPath(opts.baseUrl, root, path!) : (opts.baseUrl === false) ? this.joinPath(root, path!) : this.joinPath(root, path!);
            if (!opts.hidden && isHidden(root, rpath)) return false;
            // serve brotli file when possible otherwise gzipped file when possible
            if (opts.acceptsEncodings?.('br', 'identity') === 'br' && opts.brotli && existsSync(rpath + '.br')) {
                filename = rpath + '.br';
                encodingExt = '.br';
                contentEncoding = 'br';
            } else if (opts.acceptsEncodings?.('gzip', 'identity') === 'gzip' && opts.gzip && existsSync(rpath + '.gz')) {
                filename = rpath + '.gz';
                encodingExt = '.gz';
                contentEncoding = 'gzip';
            } else if (existsSync(rpath)) {
                filename = rpath
            } else if (opts.extensions && !/\./.exec(basename(rpath))) {
                const list = [...opts.extensions]
                for (let i = 0; i < list.length; i++) {
                    let ext = list[i]
                    if (typeof ext !== 'string') {
                        throw new TypeException('option extensions must be array of strings or false')
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
        if (!filename) return null;

        // stat
        let stats: Stats;
        try {
            stats = await stat(filename);
            // Format the path to serve static file servers
            // and not require a trailing slash for directories,
            // so that you can do both `/directory` and `/directory/`
            if (stats.isDirectory()) {
                if (!opts.format || !index) return null;
                if (isString(index)) {
                    filename = this.joinPath(filename, index);
                    if (!existsSync(filename)) {
                        return null
                    }
                    stats = await stat(filename)
                } else if (index) {
                    const idxFile = indexFiles.find(idx => existsSync(this.joinPath(filename, idx)));
                    if (!idxFile) return null;
                    filename = this.joinPath(filename, idxFile);
                    stats = await stat(filename)
                }
            }
        } catch (err) {
            if (notfound.includes((err as any).code)) {
                throw new NotFoundException((err as Error).message)
            }
            throw new InternalServerException()
        }

        return {
            filename,
            stats: stats as T
        }

    }

    private joinPath(root: string, ...path: string[]): string {
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
const indexFiles = ['index.html', 'index.htm', 'index.php', 'default.html', 'default.htm'];
const winAbsPath = /^[a-zA-Z]+:\//;
const UP_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const INDEX_REGEXP = /index(\.\w+)*$/;

