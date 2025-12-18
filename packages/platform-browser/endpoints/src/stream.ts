import { Injectable, isFunction, isString, promisify } from '@tsdi/ioc';
import { global, IPipeDestination, IReadable, isFormData } from '@tsdi/common';
import { StreamAdapter, BrotliOptions, PipeSource, ZipOptions } from '@tsdi/common';
import { Stream, Writable, Readable, Duplex, PassThrough, Transform, WritableOptions } from 'readable-stream';
import { EventEmitter } from 'pumpify';
import * as pumpify from 'pumpify';
// import * as FormData from 'form-data';
import * as rawBody from 'raw-body';
import { JsonStreamStringify } from './stringify';

@Injectable({ static: true })
export class BrowserStreamAdapter extends StreamAdapter {

    async pipeTo(source: PipeSource | Stream, destination: IPipeDestination, options: { end?: boolean } = { end: true }): Promise<void> {
        await promisify<PipeSource, Writable, any, void>(pumpify.pipeline, pumpify)(source as PipeSource, destination  as Writable, options)
            .then(r => {
                if (options.end && !(destination as Writable).writableEnded) return promisify((destination as Writable).end, destination)();
                return r;
            })
            .finally(() => {
                (source as Readable).removeAllListeners?.();
                isFunction((source as any).destroy) && (source as any).destroy();
            });

    }

    async read<T extends Uint8Array>(readable: IReadable, options: { end?: boolean } = {end: true}): Promise<T> {
        const chunks: T[] = [];
        await this.pipeTo(readable,
            async (source) => {
                for await (const chunk of source) {
                    chunks.push(chunk);
                }
            }, options);

        return Buffer.concat(chunks) as Uint8Array as T;
    }

    pipeline<T extends Writable>(source: PipeSource<any>, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(source: PipeSource<any>, transform: Transform, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(source: PipeSource<any>, transform: Transform, transform2: Transform, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(source: PipeSource<any>, transform: Transform, transform2: Transform, transform3: Transform, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(...args: any[]): T {
        return (pumpify.pipeline as any).apply(pumpify.pipeline, ...args) as T;
    }


    jsonSreamify(value: any, replacer?: Function | any[] | undefined, spaces?: string | number | undefined, cycle?: boolean | undefined): Readable {
        return new JsonStreamStringify(value, replacer, spaces, cycle);
    }

    isEventEmitter(target: any): target is EventEmitter {
        return target && isFunction(target.once) && isFunction(target.on) && isFunction(target.off) && isFunction(target.addListener) && isFunction(target.removeListener);
    }

    isStream(target: any): target is Stream {
        return target instanceof Stream;
    }

    isReadable(stream: any): stream is Readable {
        return stream instanceof Readable;
    }
    isWritable(stream: any): stream is Writable {
        return stream instanceof Writable;
    }


    createPassThrough(options?: {
        allowHalfOpen?: boolean | undefined;
        readableObjectMode?: boolean | undefined;
        writableObjectMode?: boolean | undefined;
        readableHighWaterMark?: number | undefined;
        writableHighWaterMark?: number | undefined;
        writableCorked?: number | undefined;
        construct?(this: Transform, callback: (error?: Error | null) => void): void;
        read?(this: Transform, size: number): void;
        write?(this: Transform, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
        writev?(
            this: Transform,
            chunks: Array<{
                chunk: any;
                encoding: BufferEncoding;
            }>,
            callback: (error?: Error | null) => void
        ): void;
        final?(this: Transform, callback: (error?: Error | null) => void): void;
        destroy?(this: Transform, error: Error | null, callback: (error: Error | null) => void): void;
        transform?(this: Transform, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void): void;
        flush?(this: Transform, callback: (error?: Error | null, data?: any) => void): void;
    }): PassThrough {
        return new PassThrough(options);
    }


    createWritable(options?: WritableOptions): Writable {
        return new Writable(options);
    }
    gzip<T extends Uint8Array>(buff: T): Promise<T> {
        throw new Error('Method not implemented.');
    }
    gunzip<T extends Uint8Array>(buff: T): Promise<T> {
        throw new Error('Method not implemented.');
    }

    getZipConstants<T = any>(): T {
        return {} as T;
    }

    createGzip(options?: ZipOptions): Transform {
        return new global.CompressionStream('gzip');
        // return zlib.createGzip(options);
    }
    createGunzip(options?: ZipOptions): Transform {
        return new global.DecompressionStream('gzip');
        // return zlib.createGunzip(options);
    }

    createInflate(options?: ZipOptions | undefined): Transform {
        return new global.CompressionStream('deflate');
        // return zlib.createInflate(options);
    }
    createInflateRaw(options?: ZipOptions | undefined): Transform {
        return new global.CompressionStream('deflate-raw');
        // return zlib.createInflateRaw(options);
    }

    createBrotliCompress(options?: BrotliOptions | undefined): Transform {
        return new global.CompressionStream('deflate');
        // return zlib.createBrotliCompress(options);
    }
    createBrotliDecompress(options?: BrotliOptions | undefined): Transform {
        return new global.DecompressionStream('deflate');
        // return zlib.createBrotliDecompress(options);
    }

    rawbody(
        stream: Readable,
        options: ({
            /**
             * The expected length of the stream.
             */
            length?: number | string | null;
            /**
             * The byte limit of the body. This is the number of bytes or any string
             * format supported by `bytes`, for example `1000`, `'500kb'` or `'3mb'`.
             */
            limit?: number | string | null;
            /**
             * The encoding to use to decode the body into a string. By default, a
             * `Buffer` instance will be returned when no encoding is specified. Most
             * likely, you want `utf-8`, so setting encoding to `true` will decode as
             * `utf-8`. You can use any type of encoding supported by `iconv-lite`.
             */
            encoding: string | null
        }) | string
    ): Promise<string>;
    rawbody(
        stream: Readable,
        options: ({
            /**
             * The expected length of the stream.
             */
            length?: number | string | null;
            /**
             * The byte limit of the body. This is the number of bytes or any string
             * format supported by `bytes`, for example `1000`, `'500kb'` or `'3mb'`.
             */
            limit?: number | string | null;
        }) | string
    ): Promise<Buffer>
    rawbody(stream: Readable, options: string | { length?: string | number | null | undefined; limit?: string | number | null | undefined; encoding?: string | null | undefined; }): Promise<string | Buffer> {
        return rawBody(stream as any, options);
    }

    isDuplex(target: any): target is Duplex {
        return target instanceof Duplex;
    }

    isFormDataLike(target: any): boolean {
        return isFormData(target) || target instanceof FormData;
    }
    createFormData(options?: { writable?: boolean | undefined; readable?: boolean | undefined; dataSize?: number | undefined; maxDataSize?: number | undefined; pauseStreams?: boolean | undefined; highWaterMark?: number | undefined; encoding?: string | undefined; objectMode?: boolean | undefined; read?(this: Readable, size: number): void; destroy?(this: Readable, error: Error | null, callback: (error: Error | null) => void): void; autoDestroy?: boolean | undefined; } | undefined) {
        return new FormData();
    }
    isJson(target: any): boolean {
        if (!target) return false;
        if (isString(target)) return false;
        if (this.isStream(target)) return false;
        if (Buffer.isBuffer(target)) return false;
        return true
    }

}