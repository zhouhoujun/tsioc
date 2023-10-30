
/**
 * clean up ation.
 */
export type Cleanup = () => void;

/**
 * content types.
 */
export namespace ctype {
    /**
     * stream, buffer type. 
     */
    export const OCTET_STREAM = 'application/octet-stream';
    /**
     * application json.
     */
    export const APPL_JSON = 'application/json';
    /**
     * application json.
     */
    export const APPL_JSON_UTF8 = 'application/json; charset=utf-8';
    
    /**
     * application javascript.
     */
    export const APPL_JAVASCRIPT = 'application/javascript';
    /**
     * text html.
     */
    export const TEXT_HTML = 'text/html';
    /**
     * text html utf-8.
     */
    export const TEXT_HTML_UTF8 = 'text/html; charset=utf-8';
    /**
     * text plain.
     */
    export const TEXT_PLAIN = 'text/plain';
    /**
     * text plain utf-8.
     */
    export const TEXT_PLAIN_UTF8 = 'text/plain; charset=utf-8';
    /**
     * request default accept.
     */
    export const REQUEST_ACCEPT = 'application/json, text/plain, */*';
}
