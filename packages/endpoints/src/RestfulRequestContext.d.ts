import { Incoming, Outgoing } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';
import * as Cookies from 'cookies';
/**
 * abstract Restful request context.
 *
 * 支持状态的请求上下文
 */
export declare abstract class RestfulRequestContext<TRequest extends Incoming<any> = Incoming<any>, TResponse extends Outgoing<any> = Outgoing<any>, TStatus = any> extends AbstractRequestContext<TRequest, TResponse, TStatus> {
    /**
     * Get WHATWG parsed URL.
     * Lazily memoized.
     *
     * @return {URL|Object}
     * @api public
     */
    abstract get URL(): URL;
    get params(): URLSearchParams;
    /**
     * Get full request URL.
     *
     * @return {String}
     * @api public
     */
    get href(): string;
    get path(): string;
    /**
     * Get request pathname .
     */
    get pathname(): string;
    /**
     * protocol name
     */
    abstract get protocol(): string;
    /**
     * is secure protocol or not.
     *
     * @return {Boolean}
     * @api public
     */
    abstract get secure(): boolean;
    private _query?;
    get query(): Record<string, any>;
    private _cookies?;
    get cookies(): Cookies;
    set cookies(value: Cookies);
    /**
     * Get the search string. Same as the query string
     * except it includes the leading ?.
     *
     * @return {String}
     * @api public
     */
    get search(): string;
    /**
     * Set the search string. Same as
     * request.querystring= but included for ubiquity.
     *
     * @param {String} str
     * @api public
     */
    set search(str: string);
    /**
     * Get query string.
     *
     * @return {String}
     * @api public
     */
    get querystring(): string;
    /**
     * Set query string.
     *
     * @param {String} str
     * @api public
     */
    set querystring(str: string);
    /**
     * can response stream writeable
     */
    get writable(): boolean;
    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    redirect(url: string, alt?: string): void;
}
