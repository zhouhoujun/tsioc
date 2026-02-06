import { HeaderAdapter, Incoming, MimeAdapter } from '@tsdi/common';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class AcceptsPriority {
    abstract priority(aspect: string | string[], accepts: string[], type: 'lang' | 'media' | 'charsets' | 'encodings'): string[];

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

    abstract accepts(incoming: Incoming, headerAdapter: HeaderAdapter, mimeAdapter: MimeAdapter | undefined, ...args: string[]): string | string[] | false;
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
    abstract acceptsEncodings(incoming: Incoming, headerAdapter: HeaderAdapter, ...encodings: string[]): string | string[] | false;
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
    abstract acceptsCharsets(incoming: Incoming, headerAdapter: HeaderAdapter, ...charsets: string[]): string | string[] | false;

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
    abstract acceptsLanguages(incoming: Incoming, headerAdapter: HeaderAdapter, ...langs: string[]): string | string[];
}
