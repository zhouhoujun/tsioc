import { Injectable, isArray, isBoolean, isNil, isString, lang } from '@tsdi/ioc';
import { PROCESS_ROOT } from '@tsdi/core';
import { joinPath } from '@tsdi/common';
import { BadRequestExecption } from '@tsdi/common/transport';
import { AssetContext, ContentSendAdapter, SendOptions } from '@tsdi/endpoints';

@Injectable({ static: true })
export class BrowserContentSendAdapter extends ContentSendAdapter {

    async send(ctx: AssetContext, path: string, opts: SendOptions<any>): Promise<string> {

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
        // path = path.substring(parse(path).root.length);
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
        if (absPath.test(path)) {
            throw new BadRequestExecption('Malicious Path');
        }


        const baseUrl = ctx.get(PROCESS_ROOT);
        const fsdir = new FileSystemDirectoryEntry();
        let flieEntry: FileSystemEntry|undefined;
        await lang.some(roots.map(root => () => {
            const defer = lang.defer();
            const rpath = isString(opts.baseUrl) ? joinPath(opts.baseUrl, root, path!) : (opts.baseUrl === false) ? joinPath(root, path!) : joinPath(baseUrl, root, path!);
            fsdir.getFile(rpath, {
                create: false
            }, (entry) => {
                if(!entry.isFile) defer.resolve()
                flieEntry = entry;
                defer.resolve(entry);
            }, defer.reject);
            return defer.promise;
        }), (v) => !!v);

        if (!flieEntry) return '';
        
        
        const handle = new FileSystemDirectoryHandle();
    
        const filehandle = await handle.getFileHandle(flieEntry.fullPath);
        const file = await filehandle.getFile();
        ctx.body = file;

        return flieEntry.name;
    }

}

const absPath = /^[a-zA-Z]+:\//;