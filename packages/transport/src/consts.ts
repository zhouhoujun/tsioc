
export namespace codes {

    export const ECONNREFUSED = 'ECONNREFUSED';
    export const CONN_ERR = 'CONN_ERR';
    export const EADDRINUSE = 'EADDRINUSE';

    export const LOCALHOST = 'localhost';
    export const ENOENT = 'ENOENT';

    export const CONNECT = 'connect';
    export const CONNECT_FAILED = 'connectFailed';
    export const DISCONNECT = 'disconnect';

    export const MESSAGE = 'message';
    export const DATA = 'data';
    export const ERROR = 'error';
    export const CLOSE = 'close';

    export const SUBSCRIBE = 'subscribe';
    export const CANCELLED = 'cancelled';

}

/**
 * header keys.
 */
export namespace hdrs {

    /**
     * Set or get Content-Type response header with `type`.
     */
    export const CONTENT_TYPE = 'Content-Type';
    /**
     * Set or get Content-Length field to `n`.
     */
    export const CONTENT_LENGTH = 'Content-Length';
    /**
     * transfer encoding.
     */
    export const TRANSFER_ENCODING = 'Transfer-Encoding';

    /**
     * header Accept
     */
    export const ACCEPT = 'Accept';

    /**
     * header Host
     */
    export const HOST = 'Host';

    export const AUTHORITY = ':authority';

    /**
     * header X-Forwarded-Host
     */
    export const X_FORWARDED_HOST = 'X-Forwarded-Host';

    export const IF_MODIFIED_SINCE = 'if-modified-since';
    export const IF_NONE_MATCH = 'if-none-match';
    export const CACHE_CONTROL = 'cache-control';
    export const ETAG = 'etag';
    export const LAST_MODIFIED = 'last-modified';
}

/**
 * content types.
 */
export namespace contentTypes {
    /**
     * stream, buffer type. 
     */
    export const OCTET_STREAM = 'application/octet-stream';
    /**
     * application json.
     */
    export const APPL_JSON = 'application/json';

    /**
     * text html.
     */
    export const TEXT_HTML = 'text/html';
    /**
     * text plain.
     */
    export const TEXT_PLAIN = 'text/plain';
}
