import { IDuplexStream, IReadableStream, IStream, IWritableStream, ITransformStream, IEndable } from './stream';
import { Abstract } from '@tsdi/ioc';
import { isArrayBuffer, isBlob, isFormData, UnsupportedMediaTypeExecption } from '@tsdi/common';
import { Buffer } from 'buffer';
import { toBuffer } from './utils';

export type PipeSource<T = any> = Iterable<T> | AsyncIterable<T> | IReadableStream;

/**
 * stream adapter
 */
@Abstract()
export abstract class StreamAdapter {

    /**
     * send body
     * @param data 
     * @param request 
     * @param callback 
     * @param encoding 
     */
    async sendbody(data: any, request: IWritableStream | IEndable, callback: (err?: any) => void, encoding?: string): Promise<void> {
        let source: PipeSource;
        try {
            if (isArrayBuffer(data)) {
                source = Buffer.from(data);
            } else if (Buffer.isBuffer(data)) {
                source = data;
            } else if (isBlob(data)) {
                const arrbuff = await data.arrayBuffer();
                source = Buffer.from(arrbuff);
            } else if (this.isFormDataLike(data)) {
                if (isFormData(data)) {
                    const form = this.createFormData();
                    data.forEach((v, k, parent) => {
                        form.append(k, v);
                    });
                    data = form;
                }
                source = data.getBuffer();
            } else {
                source = String(data);
            }
            if (encoding) {
                switch (encoding) {
                    case 'gzip':
                    case 'deflate':
                        source = (this.isReadable(source) ? source : this.pipeline(source, this.createPassThrough())).pipe(this.createGzip());
                        break;
                    case 'identity':
                        break;
                    default:
                        throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
                }
            }
            if (this.isStream(request)) {
                await this.pipeTo(source, request);
                callback();
            } else {
                if (this.isStream(source)) {
                    const buffers = await toBuffer(source);
                    request.end(buffers, callback);
                } else {
                    request.end(source, callback);
                }
            }
        } catch (err) {
            callback(err);
        }
    }

    /**
     * pipe line
     * @param source 
     * @param destination 
     */
    abstract pipeTo(source: PipeSource | IStream, destination: IWritableStream): Promise<void>;
    /**
     * pipe line
     * @param source 
     * @param destination 
     */
    abstract pipeline<T extends IDuplexStream>(source: PipeSource, destination: IWritableStream, callback?: (err: any | null) => void): T;
    /**
     *  pipe line
     * @param source source stream
     * @param transform transform stream
     * @param destination destination stream
     * @param callback 
     */
    abstract pipeline<T extends IDuplexStream>(source: PipeSource, transform: ITransformStream, destination: IWritableStream, callback?: (err: any | null) => void): T;
    /**
     * pipe line
     * @param source source stream
     * @param transform transform stream
     * @param transform2 transform stream
     * @param destination destination stream
     * @param callback 
     */
    abstract pipeline<T extends IDuplexStream>(source: PipeSource, transform: ITransformStream, transform2: ITransformStream, destination: IWritableStream, callback?: (err: any | null) => void): T;
    /**
     * pipe line
     * @param source source stream
     * @param transform transform stream
     * @param transform2 transform stream
     * @param transform3 transform stream
     * @param destination destination stream
     * @param callback 
     */
    abstract pipeline<T extends IDuplexStream>(source: PipeSource, transform: ITransformStream, transform2: ITransformStream, transform3: ITransformStream, destination: IWritableStream, callback?: (err: any | null) => void): T;

    /**
     * json streamify
     * @param value 
     * @param replacer 
     * @param spaces 
     * @param cycle 
     */
    abstract jsonSreamify(value: any, replacer?: Function | any[], spaces?: number | string, cycle?: boolean): IReadableStream;

    abstract isStream(target: any): target is IStream;

    abstract isReadable(stream: any): stream is IReadableStream;

    abstract isWritable(stream: any): stream is IWritableStream;

    /**
     * create writable.
     * @param options 
     */
    abstract createWritable(options?: {
        emitClose?: boolean | undefined;
        highWaterMark?: number | undefined;
        objectMode?: boolean | undefined;
        destroy?(this: IWritableStream, error: Error | null, callback: (error: Error | null) => void): void;
        autoDestroy?: boolean | undefined;
        decodeStrings?: boolean | undefined;
        defaultEncoding?: string | undefined;
        write?(this: IWritableStream, chunk: any, encoding: string, callback: (error?: Error | null) => void): void;
        final?(this: IWritableStream, callback: (error?: Error | null) => void): void;
    }): IWritableStream;
    /**
     * create PassThrough.
     * @param options 
     */
    abstract createPassThrough(options?: {
        allowHalfOpen?: boolean | undefined;
        readableObjectMode?: boolean | undefined;
        writableObjectMode?: boolean | undefined;
        readableHighWaterMark?: number | undefined;
        writableHighWaterMark?: number | undefined;
        writableCorked?: number | undefined;
        construct?(this: ITransformStream, callback: (error?: Error | null) => void): void;
        read?(this: ITransformStream, size: number): void;
        write?(this: ITransformStream, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
        writev?(
            this: ITransformStream,
            chunks: Array<{
                chunk: any;
                encoding: BufferEncoding;
            }>,
            callback: (error?: Error | null) => void
        ): void;
        final?(this: ITransformStream, callback: (error?: Error | null) => void): void;
        destroy?(this: ITransformStream, error: Error | null, callback: (error: Error | null) => void): void;
        transform?(this: ITransformStream, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void): void;
        flush?(this: ITransformStream, callback: (error?: Error | null, data?: any) => void): void;
    }): IDuplexStream;

    abstract getZipConstants<T = any>(): T;

    abstract gzip<T extends Uint8Array>(buff: T): Promise<T>
    abstract gunzip<T extends Uint8Array>(buff: T): Promise<T>;

    /**
     * Creates and returns a new `Gzip` object.
     * @param options 
     */
    abstract createGzip(options?: ZipOptions): ITransformStream;

    /**
     * Creates and returns a new `Gunzip` object.
     * @param options 
     */
    abstract createGunzip(options?: ZipOptions): ITransformStream;

    /**
     * Creates and returns a new `Inflate` object.
     * @param options 
     */
    abstract createInflate(options?: ZipOptions): ITransformStream;
    /**
     * Creates and returns a new `InflateRaw` object.
     * @param options 
     */
    abstract createInflateRaw(options?: ZipOptions): ITransformStream;

    /**
     * Creates and returns a new `BrotliCompress` object.
     */
    abstract createBrotliCompress(options?: BrotliOptions): ITransformStream;
    /**
     * Creates and returns a new `BrotliDecompress` object.
     */
    abstract createBrotliDecompress(options?: BrotliOptions): ITransformStream;

    abstract isDuplex(target: any): target is IDuplexStream;

    abstract isFormDataLike(target: any): boolean;

    abstract rawbody(
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
    abstract rawbody(
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
    ): Promise<Uint8Array>

    abstract createFormData(options?: {
        writable?: boolean;
        readable?: boolean;
        dataSize?: number;
        maxDataSize?: number;
        pauseStreams?: boolean;
        highWaterMark?: number;
        encoding?: string;
        objectMode?: boolean;
        read?(this: IReadableStream, size: number): void;
        destroy?(this: IReadableStream, error: Error | null, callback: (error: Error | null) => void): void;
        autoDestroy?: boolean;
    }): FormData;

    abstract isJson(target: any): boolean;
}


export interface ZipOptions {
    /**
     * @default constants.Z_NO_FLUSH
     */
    flush?: number | undefined;
    /**
     * @default constants.Z_FINISH
     */
    finishFlush?: number | undefined;
    /**
     * @default 16*1024
     */
    chunkSize?: number | undefined;
    windowBits?: number | undefined;
    level?: number | undefined; // compression only
    memLevel?: number | undefined; // compression only
    strategy?: number | undefined; // compression only
    dictionary?: NodeJS.ArrayBufferView | ArrayBuffer | undefined; // deflate/inflate only, empty dictionary by default
    info?: boolean | undefined;
    maxOutputLength?: number | undefined;
}

export interface BrotliOptions {
    /**
     * @default constants.BROTLI_OPERATION_PROCESS
     */
    flush?: number | undefined;
    /**
     * @default constants.BROTLI_OPERATION_FINISH
     */
    finishFlush?: number | undefined;
    /**
     * @default 16*1024
     */
    chunkSize?: number | undefined;
    params?:
    | {
        /**
         * Each key is a `constants.BROTLI_*` constant.
         */
        [key: number]: boolean | number;
    }
    | undefined;
    maxOutputLength?: number | undefined;
}

export interface FormDataHeaders {
    [key: string]: any;
}

export interface FormData extends IReadableStream {

    append(key: string, value: any, options?: {
        header?: string | Headers;
        knownLength?: number;
        filename?: string;
        filepath?: string;
        contentType?: string;
    } | string): void;
    getHeaders(userHeaders?: FormDataHeaders): FormDataHeaders;
    submit(
        params: string | any,
        callback?: (error: Error | null, response: any) => void
    ): any;
    getBuffer(): Uint8Array;
    setBoundary(boundary: string): void;
    getBoundary(): string;
    getLength(callback: (err: Error | null, length: number) => void): void;
    getLengthSync(): number;
    hasKnownLength(): boolean;

}

export interface RawBodyError extends Error {
    /**
     * The limit in bytes.
     */
    limit?: number;
    /**
     * The expected length of the stream.
     */
    length?: number;
    expected?: number;
    /**
     * The received bytes.
     */
    received?: number;
    /**
     * The encoding.
     */
    encoding?: string;
    /**
     * The corresponding status code for the error.
     */
    status: number;
    statusCode: number;
    /**
     * The error type.
     */
    type: string;
}
