/**
 * event type name.
 */
export declare namespace Events {
    const CONN_ERR = "CONN_ERR";
    const CONNECT = "connect";
    const CONNECT_FAILED = "connectFailed";
    const DISCONNECT = "disconnect";
    const CONNECTION = "connection";
    const SECURE_CONNECTION = "secureConnection";
    const PACKET = "packet";
    const GOAWAY = "goaway";
    const SOCKET = "socket";
    const HEADERS = "headers";
    const CONTINUE = "continue";
    const MESSAGE = "message";
    const MESSAGE_BUFFER = "messageBuffer";
    const CUSTOM_MESSAGE = "custom_message";
    const OPEN = "open";
    const PAUSE = "pause";
    const RESUME = "resume";
    const RESPONSE = "response";
    const REQUEST = "request";
    const DATA = "data";
    const DRAIN = "drain";
    const ERROR = "error";
    const CLOSE = "close";
    const END = "end";
    const FINISH = "finish";
    const READY = "ready";
    const TIMEOUT = "timeout";
    const STREAM = "stream";
    const ABOUT = "about";
    const ABORTED = "aborted";
    const SUBSCRIBE = "subscribe";
    const CANCELLED = "cancelled";
    const LISTENING = "listening";
    const CORK = "cork";
    const UNCORK = "uncork";
    const READABLE = "readable";
    const PREFINISH = "prefinish";
    const PREEND = "preend";
    const OFFLINE = "offline";
}
