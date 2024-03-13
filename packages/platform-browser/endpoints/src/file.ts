import { Injectable } from '@tsdi/ioc';
import {  normalize, joinPath } from '@tsdi/common';
import { IReadableStream, FileAdapter } from '@tsdi/common/transport';
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

    read(path: string, options?: any): IReadableStream {

        const stream = new PassThrough();

        (async () => {
            const handle = new FileSystemDirectoryHandle();

            const filehandle = await handle.getFileHandle(path);
            const file = await filehandle.getFile();
            stream.write(file);
        })();
        return stream;
    }
}

const absPath = /^[a-zA-Z]+:\//;