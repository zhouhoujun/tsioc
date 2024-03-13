

/**
 * events key.
 */
export namespace ev {

    export const CONN_ERR = 'CONN_ERR';

    export const CONNECT = 'connect';
    export const CONNECT_FAILED = 'connectFailed';
    export const DISCONNECT = 'disconnect';
    export const CONNECTION = 'connection';
    export const SECURE_CONNECTION = 'secureConnection';

    export const PACKET = 'packet';

    export const GOAWAY = 'goaway';

    export const SOCKET = 'socket';

    export const HEADERS = 'headers';
    export const CONTINUE = 'continue';

    export const MESSAGE = 'message';
    export const MESSAGE_BUFFER = 'messageBuffer';
    export const CUSTOM_MESSAGE = 'custom_message';
    export const OPEN = 'open';
    export const PAUSE = 'pause';
    export const RESUME = 'resume';
    export const RESPONSE = 'response';
    export const REQUEST = 'request';
    export const DATA = 'data';
    export const DRAIN = 'drain';
    export const ERROR = 'error';
    export const CLOSE = 'close';
    export const END = 'end';
    export const FINISH = 'finish';

    export const READY = 'ready';

    export const TIMEOUT = 'timeout';
    export const STREAM = 'stream';
    export const ABOUT = 'about';
    export const ABORTED = 'aborted';

    export const SUBSCRIBE = 'subscribe';
    export const CANCELLED = 'cancelled';

    export const LISTENING = 'listening';

    export const CORK = 'cork';
    export const UNCORK = 'uncork';
    export const READABLE = 'readable';
    export const PREFINISH = 'prefinish';
    export const PREEND = 'preend';

    export const OFFLINE = 'offline';
}


/**
 * header keys.
 */
export namespace hdr {

    export const IDENTITY = 'identity';
    export const LOCATION = 'location';

    export const STATUS = 'status';
    export const STATUS_MESSAGE = 'status-message';
    export const OPERATION = 'operation';

    export const STATUS2 = ':status';
    export const METHOD = ':method';
    export const PATH = ':path';
    export const AUTHORITY = ':authority';
    export const SCHEME = ':scheme';
    export const TOPIC = ':topic';

    /**
     * header Accept
     */
    export const ACCEPT = 'accept';
    export const ACCEPT_LANGUAGE = 'accept-language';
    export const ACCEPT_PATCH = 'accept-patch';
    export const ACCEPT_RANGES = 'accept-ranges';
    export const ACCEPT_CHARSET = 'accept-charset';
    export const ACCEPT_ENCODING = 'accept-encoding';


    export const AGE = 'age';
    export const ALLOW = 'allow';
    export const ALT_SVC = 'alt-svc';
    /**
     * authorization.
     */
    export const AUTHORIZATION = 'authorization';
    /**
     * cache control.
     */
    export const CACHE_CONTROL = 'cache-control';
    /**
     * connection.
     */
    export const CONNECTION = 'connection';
    /**
     * content disposition.
     */
    export const CONTENT_DISPOSITION = 'content-disposition';
    /**
     * content encoding.
     */
    export const CONTENT_ENCODING = 'content-encoding';
    /**
     * content language.
     */
    export const CONTENT_LANGUAGE = 'content-language';
    /**
     * Set or get Content-Length field to `n`.
     */
    export const CONTENT_LENGTH = 'content-length';
    /**
     * content location.
     */
    export const CONTENT_LOCATION = 'content-location';
    /**
     * content range.
     */
    export const CONTENT_RANGE = 'content-range';
    /**
     * Set or get Content-Type response header with `type`.
     */
    export const CONTENT_TYPE = 'content-type';
    /**
     * cookie.
     */
    export const COOKIE = 'cookie';
    export const COOKIE2 = 'cookie2';
    export const DATE = 'date';
    export const ETAG = 'etag';
    export const EXPECT = 'expect';
    export const EXPIRES = 'expires';
    export const FORWARDED = 'forwarded';
    export const FROM = 'from';
    /**
     * header Host
     */
    export const HOST = 'host';
    export const IF_MATCH = 'if-match';
    export const IF_MODIFIED_SINCE = 'if-modified-since';
    export const IF_NONE_MATCH = 'if-none-match';
    export const IF_UNMODIFIED_SINCE = 'if-unmodified-since';
    export const LAST_MODIFIED = 'last-modified';

    export const ORIGIN = 'origin';
    export const ORIGIN_PATH = 'origin-path';
    export const pragma = 'pragma';
    export const PROXY_URL = 'proxy-uri';
    export const PROXY_AUTHENTICATE = 'proxy-authenticate';
    export const PROXY_AUTHORIZATION = 'proxy-authorization';
    export const PUBLIC_KEY_PINS = 'public-key-pins';

    export const RANGE = 'range';
    export const REFERRER = 'referrer';
    export const REFERRER_POLICY = 'referrer-policy';
    export const RETRY_AFTER = 'retry-after';
    export const SEC_WEBSOCKET_ACCEPT = 'sec-websocket-accept';
    export const SEC_WEBSOCKET_EXTENSIONS = 'sec-websocket-extensions';
    export const SEC_WEBSOCKET_KEY = 'sec-websocket-key';
    export const SEC_WEBSOCKET_PROTOCOL = 'sec-websocket-protocol';
    export const SEC_WEBSOCKET_VERSION = 'sec-websocket-version';
    export const SET_COOKIE = 'set-cookie';
    export const TK = 'tk';
    export const TRAILER = 'trailer';
    /**
     * transfer encoding.
     */
    export const TRANSFER_ENCODING = 'transfer-encoding';
    export const UPGRADE = 'upgrade';
    export const VARY = 'vary';
    export const VIA = 'via';
    export const WARNING = 'warning';
    export const WWW_AUTHENTICATE = 'www-authenticate';

    // const X_REQUEST_URL = 'x-request-url';
    // const X_FORWARDED_PROTO = 'x-forwarded-proto';
    // /**
    //  * header x-forwarded-host
    //  */
    // const X_FORWARDED_HOST = 'x-forwarded-host';
    // const X_ACCEL_BUFFERING = 'x-accel-buffering';
   
}


// /**
//  * clean up ation.
//  */
// export type Cleanup = () => void;

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
