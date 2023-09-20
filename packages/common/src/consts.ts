
export const LOCALHOST = 'localhost';

export const identity = 'identity';

export const streamId = 'streamId';


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
