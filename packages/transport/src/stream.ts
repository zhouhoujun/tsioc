import { DuplexStream, ReadableStream, Stream, UnsupportedMediaTypeExecption, WritableStream, TransformStream, isArrayBuffer, isBlob, isFormData } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Buffer } from 'buffer';

export type PipeSource<T = any> = Iterable<T> | AsyncIterable<T> | ReadableStream<T>;

@Abstract()
export abstract class StreamAdapter {
    /**
     * pipe line
     * @param source 
     * @param destination 
     */
    abstract pipeTo(source: PipeSource, destination: WritableStream): Promise<void>;
    /**
     * pipe line
     * @param source 
     * @param destination 
     */
    abstract pipeline<T extends DuplexStream>(source: PipeSource, destination: WritableStream, callback?: (err: NodeJS.ErrnoException | null) => void): T;

    /**
     * send body
     * @param data 
     * @param request 
     * @param error 
     * @param encoding 
     */
    async sendbody(data: any, request: WritableStream, error: (err: any) => void, encoding?: string): Promise<void> {
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
                        source = (this.isReadable(source) ? source : this.pipeline(source, this.passThrough())).pipe(this.gzip());
                        break;
                    case 'identity':
                        break;
                    default:
                        throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
                }
            }
            await this.pipeTo(source, request)
        } catch (err) {
            error(err);
        }
    }

    /**
     * json streamify
     * @param value 
     * @param replacer 
     * @param spaces 
     * @param cycle 
     */
    abstract jsonSreamify(value: any, replacer?: Function | any[], spaces?: number | string, cycle?: boolean): ReadableStream;

    abstract isStream(target: any): target is Stream;

    abstract isReadable(stream: any): stream is ReadableStream;

    abstract isWritable(stream: any): stream is WritableStream;

    /**
     * create PassThrough.
     * @param options 
     */
    abstract passThrough(options?: {
        allowHalfOpen?: boolean | undefined;
        readableObjectMode?: boolean | undefined;
        writableObjectMode?: boolean | undefined;
        readableHighWaterMark?: number | undefined;
        writableHighWaterMark?: number | undefined;
        writableCorked?: number | undefined;
        construct?(this: TransformStream, callback: (error?: Error | null) => void): void;
        read?(this: TransformStream, size: number): void;
        write?(this: TransformStream, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
        writev?(
            this: TransformStream,
            chunks: Array<{
                chunk: any;
                encoding: BufferEncoding;
            }>,
            callback: (error?: Error | null) => void
        ): void;
        final?(this: TransformStream, callback: (error?: Error | null) => void): void;
        destroy?(this: TransformStream, error: Error | null, callback: (error: Error | null) => void): void;
        transform?(this: TransformStream, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void): void;
        flush?(this: TransformStream, callback: (error?: Error | null, data?: any) => void): void;
    }): DuplexStream;

    abstract getZipConstants<T = any>(): T;

    /**
     * Creates and returns a new `Gzip` object.
     * @param options 
     */
    abstract gzip(options?: ZipOptions): TransformStream;

    /**
     * Creates and returns a new `Gunzip` object.
     * @param options 
     */
    abstract gunzip(options?: ZipOptions): TransformStream;

    /**
     * Creates and returns a new `Inflate` object.
     * @param options 
     */
    abstract inflate(options?: ZipOptions): TransformStream;
    /**
     * Creates and returns a new `InflateRaw` object.
     * @param options 
     */
    abstract inflateRaw(options?: ZipOptions): TransformStream;

    /**
     * Creates and returns a new `BrotliCompress` object.
     */
    abstract brotliCompress(options?: BrotliOptions): TransformStream;
    /**
     * Creates and returns a new `BrotliDecompress` object.
     */
    abstract brotliDecompress(options?: BrotliOptions): TransformStream;

    abstract isDuplex(target: any): target is DuplexStream;

    abstract isFormDataLike(target: any): boolean;

    abstract rawbody(
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
    abstract rawbody(
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

    abstract createFormData(options?: {
        writable?: boolean;
        readable?: boolean;
        dataSize?: number;
        maxDataSize?: number;
        pauseStreams?: boolean;
        highWaterMark?: number;
        encoding?: string;
        objectMode?: boolean;
        read?(this: ReadableStream, size: number): void;
        destroy?(this: ReadableStream, error: Error | null, callback: (error: Error | null) => void): void;
        autoDestroy?: boolean;
    }): FormData;

    abstract isJson(target: any): boolean;
}

@Abstract()
export abstract class FileAdapter {

    /**
     * Determines whether {path} is an absolute path. An absolute path will always resolve to the same location, regardless of the working directory.
     *
     * If the given {path} is a zero-length string, `false` will be returned.
     *
     * @param path path to test.
     * @throws {TypeError} if `path` is not a string.
     */
    abstract isAbsolute(path: string): boolean;

    /**
     * Normalize a string path, reducing '..' and '.' parts.
     * When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
     *
     * @param path string path to normalize.
     * @throws {TypeError} if `path` is not a string.
     */
    abstract normalize(path: string): string;

    /**
     * Join all arguments together and normalize the resulting path.
     *
     * @param paths paths to join.
     * @throws {TypeError} if any of the path segments is not a string.
     */
    abstract join(...paths: string[]): string;
    /**
     * The right-most parameter is considered {to}. Other parameters are considered an array of {from}.
     *
     * Starting from leftmost {from} parameter, resolves {to} to an absolute path.
     *
     * If {to} isn't already absolute, {from} arguments are prepended in right to left order,
     * until an absolute path is found. If after using all {from} paths still no absolute path is found,
     * the current working directory is used as well. The resulting path is normalized,
     * and trailing slashes are removed unless the path gets resolved to the root directory.
     *
     * @param paths A sequence of paths or path segments.
     * @throws {TypeError} if any of the arguments is not a string.
     */
    abstract resolve(...paths: string[]): string;

    abstract existsSync(path: string): string;

    /**
     * Return the extension of the path, from the last '.' to end of string in the last portion of the path.
     * If there is no '.' in the last portion of the path or the first character of it is '.', then it returns an empty string.
     *
     * @param path the path to evaluate.
     * @param zipExt zip name
     * @throws {TypeError} if `path` is not a string.
     */
    abstract extname(path: string, zipExt?: string): string;

    abstract read(path: string, options?: any): ReadableStream;

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

export interface FormData extends ReadableStream {

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
    getBuffer(): Buffer;
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
