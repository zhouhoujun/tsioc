import { Context, ContextToken, Injector, Token, RunContext, Exception, lang, isString } from '@tsdi/ioc';
import { ContentType, HeaderAdapter, HeadersLike } from './headers';
import { Outgoing } from './outgoing';
import { OutgoingFactory } from './outgoing.impl';
import { Incoming } from './incoming';
import { AcceptsPriority, MimeAdapter } from './MimeAdapter';


const CONTENT_LENGTH = new ContextToken<number | null>(() => null);
const CONTENT_TYPE = new ContextToken<string | null>(() => ContentType.APPL_JSON);
const CONTENT_ENCODING = new ContextToken<string | null>(() => null);

// const STATUS = new ContextToken<string | number | null>(() => null);
// const STATUS_MESSAGE = new ContextToken<string | null>(() => null);

// const HEADER = new ContextToken<Record<string, string | string[] | undefined>>(() => ({}));

// const PROTOCOL = new ContextToken<string | undefined>(() => undefined);


export const REQUEST = new ContextToken<Incoming<any, any> | null>(() => null);
export const RESPONSE = new ContextToken<Outgoing<any, any> | null>(() => null);


export class RequestContext extends RunContext {

    getRequest(): Incoming {
        const req = this.get(REQUEST);
        if(!req) {
            throw new Exception('Request not init in context')
        }
        return req;
    }


    protected createResponse(response: {
        incoming?: Incoming;
        id?: any;
        socket?: any;
        pattern?: string;
        /**
         * event type
         */
        type?: number;
        status?: any;
        statusMessage?: string;
        statusCode?: any;
        statusText?: string;
        ok?: boolean;
        error?: any;
        headers?: HeadersLike;
        payload?: any;
    }): Outgoing<any, any> {
        return this.get(OutgoingFactory).create(response);
    }

    getResponse(): Outgoing<any, any> {
        let resp = this.get(RESPONSE);
        if (!resp) {
            resp = this.createResponse({ incoming: this.getRequest() });
            this.set(RESPONSE, resp);
        }

        return resp
    }


    /**
     * get response content encoding.
     * @returns 
     */
    getContentEncoding(): string | null {
        return this.get(CONTENT_ENCODING)
    }

    /**
     * set response content encoding.
     * @param encoding 
     */
    setContentEncoding(encoding: string | null) {
        this.set(CONTENT_ENCODING, encoding);
    }
    /**
     * get response content type
     * @param type 
     */
    getContentType(): string | null | undefined {
        return this.get(CONTENT_TYPE);
    }
    /**
     * set response content type
     * @param type 
     */
    setContentType(type: string | null | undefined) {
        this.set(CONTENT_TYPE, type);
    }

    /**
     * get response content length
     * @returns 
     */
    getContentLength(): number | null {
        return this.get(CONTENT_LENGTH);
    }

    /**
     * set response content length
     * @param len 
     */
    setContentLength(len: number | null) {
        this.set(CONTENT_LENGTH, len);
    }

    /**
         * Check if the given `type(s)` is acceptable, returning
         * the best match when true, otherwise `false`, in which
         * case you should respond with 406 "Not Acceptable".
         *
         * The `type` value may be a single mime type string
         * such as "application/json", the extension name
         * such as "json" or an array `["json", "html", "text/plain"]`. When a list
         * or array is given the _best_ match, if any is returned.
         *
         * Examples:
         *
         *     // Accept: text/html
         *     this.accepts('html');
         *     // => "html"
         *
         *     // Accept: text/*, application/json
         *     this.accepts('html');
         *     // => "html"
         *     this.accepts('text/html');
         *     // => "text/html"
         *     this.accepts('json', 'text');
         *     // => "json"
         *     this.accepts('application/json');
         *     // => "application/json"
         *
         *     // Accept: text/*, application/json
         *     this.accepts('image/png');
         *     this.accepts('png');
         *     // => false
         *
         *     // Accept: text/*;q=.5, application/json
         *     this.accepts('html', 'json');
         *     // => "json"
         *
         * @param {String|Array} type(s)...
         * @return {String|Array|false}
         * @api public
         */
    
        accepts(...args: string[]): string | string[] | false {
            const acceptsPriority = this.get(AcceptsPriority);
            const headerAdapter = this.get(HeaderAdapter);
            if (!acceptsPriority || !headerAdapter) return '*';
            const accepts = headerAdapter.getAccept(this.getRequest()) ?? '*';
            if (!args.length) {
                return accepts ?? false
            }
    
            const mimeAdapter = this.get(MimeAdapter)
            const medias = args.map(a => a.indexOf('/') === -1 ? mimeAdapter?.lookup(a) ?? a : a).filter(a => isString(a)) as string[];
            return lang.first(acceptsPriority.priority(accepts, medias, 'media')) ?? false
        }
        /**
        * Return accepted encodings or best fit based on `encodings`.
        *
        * Given `Accept-Encoding: gzip, deflate`
        * an array sorted by quality is returned:
        *
        *     ['gzip', 'deflate']
        *
        * @param {String|Array} encoding(s)...
        * @return {String|Array}
        * @api public
        */
        acceptsEncodings(...encodings: string[]): string | string[] | false {
            const acceptsPriority = this.get(AcceptsPriority);
            const headerAdapter = this.get(HeaderAdapter);
            if (!acceptsPriority || !headerAdapter) return '*';
            const accepts = headerAdapter.getAcceptEncoding(this.getRequest()) ?? '*';
            if (!encodings.length) {
                return accepts
            }
            return lang.first(acceptsPriority.priority(accepts, encodings, 'encodings')) ?? false
        }
        /**
         * Return accepted charsets or best fit based on `charsets`.
         *
         * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
         * an array sorted by quality is returned:
         *
         *     ['utf-8', 'utf-7', 'iso-8859-1']
         *
         * @param {String|Array} charset(s)...
         * @return {String|Array}
         * @api public
         */
        acceptsCharsets(...charsets: string[]): string | string[] | false {
            const acceptsPriority = this.get(AcceptsPriority);
            const headerAdapter = this.get(HeaderAdapter);
            if (!acceptsPriority || !headerAdapter) return '*';
            const accepts = headerAdapter.getAcceptCharset(this.getRequest()) ?? '*';
            if (!charsets.length) {
                return accepts
            }
            return lang.first(acceptsPriority.priority(accepts, charsets, 'charsets')) ?? false
        }
    
        /**
         * Return accepted languages or best fit based on `langs`.
         *
         * Given `Accept-Language: en;q=0.8, es, pt`
         * an array sorted by quality is returned:
         *
         *     ['es', 'pt', 'en']
         *
         * @param {String|Array} lang(s)...
         * @return {Array|String}
         * @api public
         */
        acceptsLanguages(...langs: string[]): string | string[] {
            const acceptsPriority = this.get(AcceptsPriority);
            const headerAdapter = this.get(HeaderAdapter);
            if (!acceptsPriority || !headerAdapter) return '*';
            const accepts = headerAdapter.getAcceptLanguage(this.getRequest()) ?? '*';
            if (!langs.length) {
                return accepts
            }
            return lang.first(acceptsPriority.priority(accepts, langs, 'lang')) ?? false
        }

}

export function createRequestContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}

