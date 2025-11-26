

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

   export const X_WWW_FORM_URLENCODED = 'application/x-www-form-urlencoded;charset=UTF-8'
}

