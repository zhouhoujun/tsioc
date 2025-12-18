import { Injectable, isArray, isBoolean, isNil, isString, lang } from '@tsdi/ioc';
import { normalize, joinPath, FindOptions, IStats, FileStats, BadRequestException } from '@tsdi/common';
import { IReadable, FileAdapter } from '@tsdi/common';
import { PassThrough } from 'readable-stream';



@Injectable()
export class BrowserFileAdapter extends FileAdapter {

    isAbsolute(path: string): boolean {
        return absPath.test(path)
    }
    normalize(path: string): string {
        return normalize(path)
    }
    join(...paths: string[]): string {
        return joinPath(...paths)
    }
    resolve(...paths: string[]): string {
        return joinPath(...paths)
    }
    extname(path: string, zipExt?: string | undefined): string {
        if (zipExt && path.lastIndexOf('.' + zipExt) == path.length - 2 - zipExt.length) {
            path = path.slice(0, path.lastIndexOf(zipExt) + 1)
        }
        return path.lastIndexOf('.') > path.lastIndexOf('/') ? path.substring(path.lastIndexOf('.') + 1) : ''
    }

    existsSync(path: string): boolean {
        return false
    }

    read(path: string, options?: any): IReadable {

        const stream = new PassThrough();

        (async () => {
            const handle = new FileSystemDirectoryHandle();
            const filehandle = await handle.getFileHandle(path);
            const file = await filehandle.getFile();
            stream.write(file);
        })();
        return stream;
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
        // path = path.substring(parse(path).root.length);
        const roots = isArray(opts.root) ? opts.root : [opts.root ?? 'public'];
        try {
            path = decodeURIComponent(path)
        } catch {
            throw new BadRequestException('failed to decode url');
        }

        let index = opts.index;
        if (isBoolean(index)) {
            if (index) {
                index = 'index.html';
            } else if (INDEX_REGEXP.test(path)) {
                return null;
            }
        }
        if (index && endSlash) path += index;
        if (absPath.test(path)) {
            throw new BadRequestException('Malicious Path');
        }


        const baseUrl = opts.baseUrl //ctx.get(PROCESS_ROOT);
        const fsdir = new FileSystemDirectoryEntry();
        let flieEntry: FileSystemEntry | undefined;
        await lang.some(roots.map(root => () => {
            const defer = lang.defer();
            const rpath = isString(opts.baseUrl) ? joinPath(opts.baseUrl, root, path!) : (opts.baseUrl === false) ? joinPath(root, path!) : joinPath(baseUrl, root, path!);
            fsdir.getFile(rpath, {
                create: false
            }, (entry) => {
                if (!entry.isFile) defer.resolve()
                flieEntry = entry;
                defer.resolve(entry);
            }, defer.reject);
            return defer.promise;
        }), (v) => !!v);

        if (!flieEntry) return null;

        return {
            filename: flieEntry.fullPath,
            stats: null!
        };
    }

}

const absPath = /^[a-zA-Z]+:\//;
const INDEX_REGEXP = /index(\.\w+)*$/;