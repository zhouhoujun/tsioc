import { Injectable } from '@tsdi/ioc';
import { IReadableStream } from '@tsdi/core';
import { FileAdapter } from '@tsdi/transport';
import { isAbsolute, resolve, join, normalize, extname, basename } from 'path';
import { existsSync, createReadStream } from 'fs';


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

    read(path: string, options?: any): IReadableStream<any> {
        return createReadStream(path, options)
    }
}