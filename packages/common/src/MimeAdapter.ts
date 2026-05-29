import { Abstract } from '@tsdi/ioc';
import { Incoming } from './incoming';

/**
 * mime type adapter.
 */
@Abstract()
export abstract class MimeAdapter {
    /**
     * mime types.
     */
    abstract get mimeTypes(): MimeTypes;
    /**
     * Get the default charset for a MIME type.
     * @param type 
     */
    abstract charset(type: string): string | false;
    /**
     * Get the default extension for a MIME type.
     * @param extname 
     * 
     */
    abstract extension(extname: string): string | false;

    /**
     * Create a full Content-Type header given a MIME type or extension.
     * @param str 
     */
    abstract contentType(str: string): string | false;
    /**
     * Lookup the MIME type for a file path/extension.
     * @param path 
     */
    abstract lookup(path: string): string | false;

    /**
     * Format object to media type.
     * @param media 
     */
    abstract format(media: SplitType): string;
    /**
     * Parse media type to object.
     * @param type 
     */
    abstract parse(type: string): SplitType;
    /**
     *  normalize Content-Type media type.
     */
    abstract normalize(type: string): string | false;

    abstract match(types: string[], target: string): string | false;

    isJson(contentType: string) {
        return this.match(this.mimeTypes.json, contentType)
    }

    isXml(contentType: string) {
        return this.match(this.mimeTypes.xml, contentType)
    }

    isText(contentType: string) {
        return this.match(this.mimeTypes.text, contentType)
    }

    isForm(contentType: string) {
        return this.match(this.mimeTypes.form, contentType);
    }

}

/**
 * split type
 */
export interface SplitType {
    type: string;
    subtype: string;
    suffix?: string;
    parameters?: Record<string, any>;
}

/**
 * mime source.
 */
export interface MimeSource {
    source?: string;
    charset?: string;
    compressible?: boolean;
    extensions?: string[];
}

/**
 * mime db.
 */
@Abstract()
export abstract class MimeDb {
    abstract from(db: Record<string, MimeSource>): void;
    abstract has(mime: string): boolean;
    abstract get(mime: string): MimeSource | undefined;
    abstract set(mime: string, source: MimeSource): void;
    abstract remove(mime: string): void;
    /**
     * get mime with extenstion name.
     * @param name
     * @returns mime type.
     */
    abstract extension(name: string): string | undefined;
}

@Abstract()
export abstract class MimeTypes {
    /**
     * json alias mime names
     */
    abstract get json(): string[];
    /**
     * form alias mime names
     */
    abstract get form(): string[];
    /**
     * text alias mime names
     */
    abstract get text(): string[];
    /**
     * xml alias mime names
     */
    abstract get xml(): string[];
    /**
     * append mime type.
     * @param type type of mime.
     * @param mimes mime names.
     */
    abstract append(type: 'json' | 'form' | 'text' | 'xml', mimes: string[]): this;
}


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

    abstract accepts(incoming: Incoming, mimeAdapter: MimeAdapter | undefined, ...args: string[]): string | string[] | false;
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
    abstract acceptsEncodings(incoming: Incoming, ...encodings: string[]): string | string[] | false;
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
    abstract acceptsCharsets(incoming: Incoming, ...charsets: string[]): string | string[] | false;

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
    abstract acceptsLanguages(incoming: Incoming, ...langs: string[]): string | string[];
}

