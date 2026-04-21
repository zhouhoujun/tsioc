"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Events = void 0;
/**
 * event type name.
 */
var Events;
(function (Events) {
    Events.CONN_ERR = 'CONN_ERR';
    Events.CONNECT = 'connect';
    Events.CONNECT_FAILED = 'connectFailed';
    Events.DISCONNECT = 'disconnect';
    Events.CONNECTION = 'connection';
    Events.SECURE_CONNECTION = 'secureConnection';
    Events.PACKET = 'packet';
    Events.GOAWAY = 'goaway';
    Events.SOCKET = 'socket';
    Events.HEADERS = 'headers';
    Events.CONTINUE = 'continue';
    Events.MESSAGE = 'message';
    Events.MESSAGE_BUFFER = 'messageBuffer';
    Events.CUSTOM_MESSAGE = 'custom_message';
    Events.OPEN = 'open';
    Events.PAUSE = 'pause';
    Events.RESUME = 'resume';
    Events.RESPONSE = 'response';
    Events.REQUEST = 'request';
    Events.DATA = 'data';
    Events.DRAIN = 'drain';
    Events.ERROR = 'error';
    Events.CLOSE = 'close';
    Events.END = 'end';
    Events.FINISH = 'finish';
    Events.READY = 'ready';
    Events.TIMEOUT = 'timeout';
    Events.STREAM = 'stream';
    Events.ABOUT = 'about';
    Events.ABORTED = 'aborted';
    Events.SUBSCRIBE = 'subscribe';
    Events.CANCELLED = 'cancelled';
    Events.LISTENING = 'listening';
    Events.CORK = 'cork';
    Events.UNCORK = 'uncork';
    Events.READABLE = 'readable';
    Events.PREFINISH = 'prefinish';
    Events.PREEND = 'preend';
    Events.OFFLINE = 'offline';
})(Events || (exports.Events = Events = {}));
//# sourceMappingURL=events.js.map