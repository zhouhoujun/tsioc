import { Injectable, isFunction, isString, promisify } from '@tsdi/ioc';
import { isFormData } from '@tsdi/common';
import { StreamAdapter, ev, isBuffer, BrotliOptions, PipeSource, ZipOptions, IStream, IReadable, IWritable, IDuplex, IPassThrough } from '@tsdi/common/transport';
import { EventEmitter } from 'events';
import { Stream, Writable, WritableOptions, Readable, Duplex, PassThrough, Transform, PipelineSource, isReadable, TransformCallback, pipeline } from 'stream';
import * as rstm from 'readable-stream'
import { pipeline as pmPipeline } from 'stream/promises';
import * as zlib from 'zlib';
import * as FormData from 'form-data';
import * as rawBody from 'raw-body';
import { JsonStreamStringify } from './stringify';


const gzip = promisify(zlib.gzip, zlib);
const gunzip = promisify(zlib.gunzip, zlib);

@Injectable({ static: true })
export class NodeStreamAdapter extends StreamAdapter {

    async pipeTo(source: PipeSource | IStream, destination: Writable, options: { end?: boolean, signal?: any } = { end: true }): Promise<void> {
        await pmPipeline(source as PipelineSource<any>, destination, options as any)
            .then(r => {
                if (options.end && !destination.writableEnded) return promisify(destination.end, destination)();
                return r;
            })
            .finally(() => {
                (source as Readable).removeAllListeners?.();
                isFunction((source as any).destroy) && (source as any).destroy();
            });
    }

    pipeline<T extends Writable>(source: PipeSource<any>, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(source: PipeSource<any>, transform: Transform, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(source: PipeSource<any>, transform: Transform, transform2: Transform, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(source: PipeSource<any>, transform: Transform, transform2: Transform, transform3: Transform, destination: T, callback?: (err: NodeJS.ErrnoException | null) => void): T;
    pipeline<T extends Writable>(...args: any[]): T {
        if (!isFunction(args[args.length - 1])) {
            args.push((err: any) => {
                if (err) throw err
            });
        }
        return (pipeline as Function)(...args) as T;
    }

    jsonSreamify(value: any, replacer?: Function | any[] | undefined, spaces?: string | number | undefined, cycle?: boolean | undefined): Readable {
        return new JsonStreamStringify(value, replacer, spaces, cycle);
    }

    isEventEmitter(target: any): target is EventEmitter {
        return target instanceof EventEmitter
    }

    isStream(target: any): target is IStream {
        return target instanceof Stream || target instanceof rstm.Stream;
    }

    isReadable(stream: any): stream is IReadable {
        return isReadable(stream) || stream instanceof rstm.Readable;
    }

    isWritable(stream: any): stream is IWritable {
        return stream instanceof Writable || stream instanceof rstm.Writable;
    }

    isDuplex(target: any): target is IDuplex {
        return target instanceof Duplex || target instanceof rstm.Duplex;
    }

    createWritable(options?: {
        emitClose?: boolean | undefined;
        highWaterMark?: number | undefined;
        objectMode?: boolean | undefined;
        destroy?(this: Writable, error: Error | null, callback: (error: Error | null) => void): void;
        autoDestroy?: boolean | undefined;
        decodeStrings?: boolean | undefined;
        defaultEncoding?: string | undefined;
        write?(this: Writable, chunk: any, encoding: string, callback: (error?: Error | null) => void): void;
        final?(this: Writable, callback: (error?: Error | null) => void): void;
    }): IWritable {
        return new Writable(options as WritableOptions);
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
        transform?(this: Transform, chunk: any, encoding: BufferEncoding, callback: TransformCallback): void;
        flush?(this: Transform, callback: TransformCallback): void;
    }): IPassThrough {
        return new PassThrough(options);
    }

    gzip<T extends Uint8Array>(buff: T): Promise<T> {
        return gzip(buff) as any
    }

    gunzip<T extends Uint8Array>(buff: T): Promise<T> {
        return gunzip(buff) as any;
    }

    getZipConstants<T = any>(): T {
        return zlib.constants as T;
    }

    createGzip(options?: ZipOptions): Transform {
        return zlib.createGzip(options);
    }
    createGunzip(options?: ZipOptions): Transform {
        return zlib.createGunzip(options);
    }

    createInflate(options?: ZipOptions | undefined): Transform {
        return zlib.createInflate(options);
    }
    createInflateRaw(options?: ZipOptions | undefined): Transform {
        return zlib.createInflateRaw(options);
    }

    createBrotliCompress(options?: BrotliOptions | undefined): Transform {
        return zlib.createBrotliCompress(options);
    }
    createBrotliDecompress(options?: BrotliOptions | undefined): Transform {
        return zlib.createBrotliDecompress(options);
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
        return rawBody(stream, options);
    }


    isFormDataLike(target: any): boolean {
        return isFormData(target) || target instanceof FormData;
    }
    createFormData(options?: { writable?: boolean | undefined; readable?: boolean | undefined; dataSize?: number | undefined; maxDataSize?: number | undefined; pauseStreams?: boolean | undefined; highWaterMark?: number | undefined; encoding?: string | undefined; objectMode?: boolean | undefined; read?(this: Readable, size: number): void; destroy?(this: Readable, error: Error | null, callback: (error: Error | null) => void): void; autoDestroy?: boolean | undefined; } | undefined) {
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