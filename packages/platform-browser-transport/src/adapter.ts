import { WritableStream, DuplexStream, ReadableStream, TransformStream, isFormData } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { BrotliOptions, PipeSource, StreamAdapter, ZipOptions, ev, isBuffer } from '@tsdi/transport';
import { Stream, Writable, Readable, Duplex, PassThrough, Transform } from 'readable-stream';
import * as pumpify from 'pumpify';
import * as zlib from 'browserify-zlib';
import * as FormData from 'form-data';
import * as rawBody from 'raw-body';
import { JsonStreamStringify } from './stringify';


@Injectable({ static: true })
export class BrowserStreamAdapter extends StreamAdapter {

    async pipeTo(source: PipeSource, destination: WritableStream<any>): Promise<void> {
        await pumpify.obj(source, destination);
        if (source instanceof Readable) source.destroy();
    }

    pipeline<T extends DuplexStream>(source: PipeSource<any>, destination: WritableStream<any>, callback?: (err: any | null) => void): T {
        // if(this.isStream(source)){
        //     callback && source.once('error', callback);
        //     return source.pipe(destination);

        // }
        return pumpify.obj(source, destination, callback) as T;
    }

    jsonSreamify(value: any, replacer?: Function | any[] | undefined, spaces?: string | number | undefined, cycle?: boolean | undefined): ReadableStream<any> {
        return new JsonStreamStringify(value, replacer, spaces, cycle);
    }

    isStream(target: any): target is Stream {
        return target instanceof Stream;
    }

    isReadable(stream: any): stream is ReadableStream<any> {
        return stream instanceof Readable;
    }
    isWritable(stream: any): stream is WritableStream<any> {
        return stream instanceof Writable;
    }
    passThrough(options?: {
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
    }): DuplexStream {
        return new PassThrough(options);
    }


    getZipConstants<T = any>(): T {
        return zlib.constants as T;
    }

    gzip(options?: ZipOptions): TransformStream {
        return zlib.createGzip(options);
    }
    gunzip(options?: ZipOptions): TransformStream {
        return zlib.createGunzip(options);
    }

    inflate(options?: ZipOptions | undefined): TransformStream {
        return zlib.createInflate(options);
    }
    inflateRaw(options?: ZipOptions | undefined): TransformStream {
        return zlib.createInflateRaw(options);
    }

    brotliCompress(options?: BrotliOptions | undefined): TransformStream {
        return zlib.createBrotliCompress(options);
    }
    brotliDecompress(options?: BrotliOptions | undefined): TransformStream {
        return zlib.createBrotliDecompress(options);
    }

    rawbody(
        stream: ReadableStream,
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
        stream: ReadableStream,
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
    rawbody(stream: Readable, options: string | { length?: string | number | null | undefined; limit?: string | number | null | undefined; encoding?: string | null | undefined; }): Promise<string|Buffer> {
        return rawBody(stream, options);
    }

    isDuplex(target: any): target is DuplexStream {
        return target instanceof Duplex;
    }

    isFormDataLike(target: any): boolean {
        return isFormData(target) || target instanceof FormData;
    }
    createFormData(options?: { writable?: boolean | undefined; readable?: boolean | undefined; dataSize?: number | undefined; maxDataSize?: number | undefined; pauseStreams?: boolean | undefined; highWaterMark?: number | undefined; encoding?: string | undefined; objectMode?: boolean | undefined; read?(this: ReadableStream<any>, size: number): void; destroy?(this: ReadableStream<any>, error: Error | null, callback: (error: Error | null) => void): void; autoDestroy?: boolean | undefined; } | undefined) {
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