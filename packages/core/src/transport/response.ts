import { Abstract, isArray } from '@tsdi/ioc';
import { HeadersOption } from './packet';


/**
 * abstract response.
 */
@Abstract()
export abstract class Response {
    /**
     * Get response status code.
     *
     * @return {Number}
     * @api public
     */
    abstract get status(): number;
    /**
     * Set response status code.
     *
     * @param {Number} code
     * @api public
     */
    abstract set status(code: number);

    get ok(): boolean {
        return this.status === 200;
    }

    /**
     * get response error
     */
    abstract get error(): any;
    /**
     * set response error
     */
    abstract set error(err: any)

    /**
     * Get response status message
     *
     * @return {String}
     * @api public
     */
    abstract get message(): string;
    /**
     * Set response status message
     *
     * @param {String} msg
     * @api public
     */

    abstract set message(msg: string);

    /**
     * Get response body.
     *
     * @return {Mixed}
     * @api public
     */
    abstract get body(): any;
    /**
     * Set response body.
     *
     * @param {String|Buffer|Object|Stream|Observable<any>} val
     * @api public
     */
    abstract set body(val: any);

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    abstract get length(): number;
    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    abstract set length(n: number);

    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    get type(): string {
        const type = this.getHeader('Content-Type');
        if (!type) return '';
        return type?.toString().split(';', 1)[0];
    }
    /**
     * Set Content-Type response header with `type` through `mime.lookup()`
     * when it does not contain a charset.
     *
     * Examples:
     *
     *     this.type = '.html';
     *     this.type = 'html';
     *     this.type = 'json';
     *     this.type = 'application/json';
     *     this.type = 'png';
     *
     * @param {String} type
     * @api public
     */
    set type(type: string) {
        if (type) {
            this.setHeader('Content-Type', type);
        } else {
            this.removeHeader('Content-Type');
        }
    };

    abstract get headersSent(): boolean;

    abstract getHeaders(): Record<string, string | string[] | number>;

    abstract getHeader(name: string): string | string[] | number;

    getHeaderFirst(name: string): string | number {
        const vals = this.getHeader(name);
        return isArray(vals) ? vals[0] : vals;
    }

    abstract hasHeader(name: string): boolean;

    abstract setHeader(name: string, value: number | string | string[]): void;

    abstract removeHeader(name: string): void;

}

/**
 * response init option for {@link Response}.
 */
export interface ResponseOption {
    headers?: HeadersOption;
    status?: number;
    statusText?: string;
}
