
export const LOCALHOST = 'localhost';

/**
 * events key.
 */
export namespace ev {

    export const ECONNREFUSED = 'ECONNREFUSED';
    export const CONN_ERR = 'CONN_ERR';
    export const EADDRINUSE = 'EADDRINUSE';
    export const ENOTDIR = 'ENOTDIR';
    export const ENOENT = 'ENOENT';
    export const ENAMETOOLONG = 'ENAMETOOLONG';

    export const CONNECT = 'connect';
    export const CONNECT_FAILED = 'connectFailed';
    export const DISCONNECT = 'disconnect';

    export const MESSAGE = 'message';
    export const RESPONSE = 'response';
    export const DATA = 'data';
    export const ERROR = 'error';
    export const CLOSE = 'close';
    export const END = 'end';
    export const TIMEOUT = 'timeout';
    export const STREAM = 'stream';
    export const ABOUT = 'about';

    export const SUBSCRIBE = 'subscribe';
    export const CANCELLED = 'cancelled';
}

/**
 * header keys.
 */
export namespace hdr {

    /**
     * Set or get Content-Type response header with `type`.
     */
    export const CONTENT_TYPE = 'content-type';
    /**
     * Set or get Content-Length field to `n`.
     */
    export const CONTENT_LENGTH = 'content-length';
    export const CONTENT_ENCODING = 'content-encoding';
    /**
     * transfer encoding.
     */
    export const TRANSFER_ENCODING = 'transfer-encoding';

    export const IDENTITY = 'identity';

    export const REFERRER = 'referrer';

    export const LOCATION = 'location';

    export const CONTENT_DISPOSITION = 'content-disposition';

    /**
     * header Accept
     */
    export const ACCEPT = 'accept';

    export const ACCEPT_CHARSET = 'accept-charset';

    export const ACCEPT_ENCODING = 'accept-encoding';

    export const ACCEPT_LANGUAGE = 'accept-language';

    /**
     * header Host
     */
    export const HOST = 'host';

    export const AUTHORITY = ':authority';

    export const ORIGIN = 'origin';

    export const USER_AGENT = 'user-agent';


    export const VARY = 'vary';
    export const X_FORWARDED_PROTO = 'x-forwarded-proto';
    /**
     * header x-forwarded-host
     */
    export const X_FORWARDED_HOST = 'x-forwarded-host';
    export const X_DNS_PREFETCH_CONTROL = 'x-dns-prefetch-control';
    export const X_DOWNLOAD_OPTIONS = 'x-download-options';
    export const X_FRAME_OPTIONS = 'x-frame-options';
    export const X_POWERED_BY = 'x-powered-by';
    export const X_CONTENT_TYPE_OPTIONS = 'x-content-type-options';
    export const X_XSS_PROTECTION = 'x-xss-protection';
    export const STRICT_TRANSPORT_SECURITY = 'strict-transport-security';

    export const CSRF_TOKEN = 'csrf-token';
    export const XSRF_TOKEN = 'xsrf-token';
    export const X_CSRF_TOKEN = 'x-csrf-token';
    export const X_XSRF_TOKEN = 'x-xsrf-token';

    export const IF_MODIFIED_SINCE = 'if-modified-since';
    export const IF_NONE_MATCH = 'if-none-match';
    export const CACHE_CONTROL = 'cache-control';
    export const ETAG = 'etag';
    export const LAST_MODIFIED = 'last-modified';

    export const ACCESS_CONTROL_ALLOW_ORIGIN = 'access-control-allow-origin';
    export const ACCESS_CONTROL_ALLOW_CREDENTIALS = 'access-control-allow-credentials';
    export const ACCESS_CONTROL_REQUEST_METHOD = 'access-control-request-method';
    export const ACCESS_CONTROL_MAX_AGE = 'access-control-max-age';
    export const ACCESS_CONTROL_ALLOW_METHODS = 'access-control-allow-methods';
    export const ACCESS_CONTROL_REQUEST_HEADERS = 'access-control-request-headers';
    export const ACCESS_CONTROL_ALLOW_HEADERS = 'access-control-allow-headers';
    export const ACCESS_CONTROL_EXPOSE_HEADERS = 'access-control-expose-headers';
}
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
}
