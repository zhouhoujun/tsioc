import { Injectable, isFunction, isString, lang } from '@tsdi/ioc';
import { global, isFormData, StreamAdapter, BrotliOptions, IDuplexStream, IReadableStream, ITransformStream, IWritableStream, PipeSource, ZipOptions, ev, isBuffer } from '@tsdi/common';
import { Stream, Writable, Readable, Duplex, PassThrough, Transform, WritableOptions } from 'readable-stream';
import * as pumpify from 'pumpify';
import * as FormData from 'form-data';
import * as rawBody from 'raw-body';
import { JsonStreamStringify } from './stringify';

@Injectable({ static: true })
export class BrowserStreamAdapter extends StreamAdapter {

    async pipeTo(source: PipeSource | Stream, destination: IWritableStream): Promise<void> {
        if (this.isStream(source) && !this.isReadable(source)) {
            const defer = lang.defer();
            source.once(ev.ERROR, (err) => {
                defer.reject(err)
            });
            source.once(ev.END, () => {
                defer.resolve()
            });
            source.pipe(destination);
            return await defer.promise
                .finally(() => {
                    isFunction((source as any).destroy) && (source as any).destroy();
                })
        } else {
            await pumpify.obj.pipeline(source, destination);
            if (source instanceof Readable) source.destroy();
        }
    }

    pipeline<T extends IDuplexStream>(source: PipeSource<any>, destination: IWritableStream, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends IDuplexStream>(source: PipeSource<any>, transform: ITransformStream, destination: IWritableStream, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends IDuplexStream>(source: PipeSource<any>, transform: ITransformStream, transform2: ITransformStream, destination: IWritableStream, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends IDuplexStream>(source: PipeSource<any>, transform: ITransformStream, transform2: ITransformStream, transform3: ITransformStream, destination: IWritableStream, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends IDuplexStream>(...args: any[]): T {
        return (pumpify.obj.pipeline as any).apply(pumpify.obj.pipeline, ...args) as T;
    }


    jsonSreamify(value: any, replacer?: Function | any[] | undefined, spaces?: string | number | undefined, cycle?: boolean | undefined): IReadableStream {
        return new JsonStreamStringify(value, replacer, spaces, cycle);
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
    }): IDuplexStream {
        return new PassThrough(options);
    }

    
    createWritable(options?: WritableOptions): IWritableStream {
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

    createGzip(options?: ZipOptions): ITransformStream {
        return new global.CompressionStream('gzip');
        // return zlib.createGzip(options);
    }
    createGunzip(options?: ZipOptions): ITransformStream {
        return new global.DecompressionStream('gzip');
        // return zlib.createGunzip(options);
    }

    createInflate(options?: ZipOptions | undefined): ITransformStream {
        return new global.CompressionStream('deflate');
        // return zlib.createInflate(options);
    }
    createInflateRaw(options?: ZipOptions | undefined): ITransformStream {
        return new global.CompressionStream('deflate-raw');
        // return zlib.createInflateRaw(options);
    }

    createBrotliCompress(options?: BrotliOptions | undefined): ITransformStream {
        return new global.CompressionStream('deflate');
        // return zlib.createBrotliCompress(options);
    }
    createBrotliDecompress(options?: BrotliOptions | undefined): ITransformStream {
        return new global.DecompressionStream('deflate');
        // return zlib.createBrotliDecompress(options);
    }

    rawbody(
        stream: IReadableStream,
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
        stream: IReadableStream,
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
        return rawBody(stream, options);
    }

    isDuplex(target: any): target is IDuplexStream {
        return target instanceof Duplex;
    }

    isFormDataLike(target: any): boolean {
        return isFormData(target) || target instanceof FormData;
    }
    createFormData(options?: { writable?: boolean | undefined; readable?: boolean | undefined; dataSize?: number | undefined; maxDataSize?: number | undefined; pauseStreams?: boolean | undefined; highWaterMark?: number | undefined; encoding?: string | undefined; objectMode?: boolean | undefined; read?(this: IReadableStream, size: number): void; destroy?(this: IReadableStream, error: Error | null, callback: (error: Error | null) => void): void; autoDestroy?: boolean | undefined; } | undefined) {
        return new FormData(options);
    }
    isJson(target: any): boolean {
        if (!target) return false;
        if (isString(target)) return false;
        if (this.isStream(target)) return false;
        if (isBuffer(target)) return false;
        return true
    }

}