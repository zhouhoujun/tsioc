import { Abstract } from '@tsdi/ioc';

/**
 * file adapter
 */
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

    /**
     * Return the extension of the path, from the last '.' to end of string in the last portion of the path.
     * If there is no '.' in the last portion of the path or the first character of it is '.', then it returns an empty string.
     *
     * @param path the path to evaluate.
     * @param zipExt zip name
     * @throws {TypeError} if `path` is not a string.
     */
    abstract extname(path: string, zipExt?: string): string;

     /**
     * Returns `true` if the path exists, `false` otherwise.
     *
     */
    abstract existsSync(path: string): string;

    /**
     * `options` may also include a `start` option to allow writing data at some
     * position past the beginning of the file, allowed values are in the
     * \[0, [`Number.MAX_SAFE_INTEGER`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)\] range. Modifying a file rather than
     * replacing it may require the `flags` option to be set to `r+` rather than the
     * default `w`. The `encoding` can be any one of those accepted by `Buffer`.
     *
     * If `autoClose` is set to true (default behavior) on `'error'` or `'finish'`the file descriptor will be closed automatically. If `autoClose` is false,
     * then the file descriptor won't be closed, even if there's an error.
     * It is the application's responsibility to close it and make sure there's no
     * file descriptor leak.
     *
     * By default, the stream will emit a `'close'` event after it has been
     * destroyed.  Set the `emitClose` option to `false` to change this behavior.
     *
     * By providing the `fs` option it is possible to override the corresponding `fs`implementations for `open`, `write`, `writev` and `close`. Overriding `write()`without `writev()` can reduce
     * performance as some optimizations (`_writev()`)
     * will be disabled. When providing the `fs` option, overrides for at least one of`write` and `writev` are required. If no `fd` option is supplied, an override
     * for `open` is also required. If `autoClose` is `true`, an override for `close`is also required.
     *
     * Like `fs.ReadStream`, if `fd` is specified, `fs.WriteStream` will ignore the`path` argument and will use the specified file descriptor. This means that no`'open'` event will be
     * emitted. `fd` should be blocking; non-blocking `fd`s
     * should be passed to `net.Socket`.
     *
     * If `options` is a string, then it specifies the encoding.
     */
    abstract read(path: string, options?: any): ReadableStream;

}
