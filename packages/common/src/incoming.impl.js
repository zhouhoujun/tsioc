"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicClientIncomingFactory = exports.TopicClientIncoming = exports.UrlClientIncomingFactory = exports.UrlClientIncoming = exports.AbstractClientIncoming = exports.TopicIncomingFactory = exports.DefaultTopicIncoming = exports.UrlIncomingFactory = exports.DefaultUrlIncoming = exports.AbstractIncoming = exports.ClientIncomingFactory = exports.IncomingFactory = exports.AbstractIncomingFactory = void 0;
exports.parseUrlIncoming = parseUrlIncoming;
exports.parseTopicIncoming = parseTopicIncoming;
exports.parseUrlClientIncoming = parseUrlClientIncoming;
exports.parseTopicClientIncoming = parseTopicClientIncoming;
exports.provideIncomings = provideIncomings;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const headers_1 = require("./headers");
const StreamAdapter_1 = require("./StreamAdapter");
/**
 * Abstract incoming factory.
 */
let AbstractIncomingFactory = class AbstractIncomingFactory {
};
exports.AbstractIncomingFactory = AbstractIncomingFactory;
exports.AbstractIncomingFactory = AbstractIncomingFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AbstractIncomingFactory);
/**
 * server incoming factory.
 */
let IncomingFactory = class IncomingFactory {
};
exports.IncomingFactory = IncomingFactory;
exports.IncomingFactory = IncomingFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], IncomingFactory);
/**
 * Client incoming factory.
 */
let ClientIncomingFactory = class ClientIncomingFactory {
};
exports.ClientIncomingFactory = ClientIncomingFactory;
exports.ClientIncomingFactory = ClientIncomingFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ClientIncomingFactory);
/**
 * Incoming base packet.
 */
let AbstractIncoming = class AbstractIncoming {
    get paths() {
        return this.pattern;
    }
    constructor(init) {
        this.id = init.id;
        this.pattern = init.pattern;
        this.headers = new headers_1.HeaderMappings(init.headers);
        this.body = init.body ?? init.payload;
        this.query = init.query ?? init.params;
        this.timeout = init.timeout;
    }
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field) {
        return this.headers.has(field);
    }
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field) {
        return this.headers.getHeader(field);
    }
};
exports.AbstractIncoming = AbstractIncoming;
exports.AbstractIncoming = AbstractIncoming = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [Object])
], AbstractIncoming);
/**
 * Incoming packet.
 */
class DefaultUrlIncoming extends AbstractIncoming {
    get paths() {
        return this.url;
    }
    constructor(init) {
        super(init);
        this.url = init.url;
        this.method = init.method ?? init.defaultMethod ?? '';
    }
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field) {
        return this.headers.has(field);
    }
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field) {
        return this.headers.getHeader(field);
    }
}
exports.DefaultUrlIncoming = DefaultUrlIncoming;
function parseUrlIncoming(init) {
    const incoming = (init.body ?? init.payload);
    incoming.id = init.id;
    incoming.url = init.url;
    incoming.method = init.method ?? init.defaultMethod ?? '';
    incoming.headers = new headers_1.HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    return incoming;
}
let UrlIncomingFactory = class UrlIncomingFactory {
    constructor(streamAdapter) {
        this.streamAdapter = streamAdapter;
    }
    create(options) {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseUrlIncoming(options);
        }
        return new DefaultUrlIncoming(options);
    }
};
exports.UrlIncomingFactory = UrlIncomingFactory;
exports.UrlIncomingFactory = UrlIncomingFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [StreamAdapter_1.StreamAdapter])
], UrlIncomingFactory);
/**
 * Incoming packet.
 */
class DefaultTopicIncoming extends AbstractIncoming {
    get paths() {
        return this.topic;
    }
    constructor(init) {
        super(init);
        this.topic = init.topic;
        this.responseTopic = init.responseTopic;
    }
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field) {
        return this.headers.has(field);
    }
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field) {
        return this.headers.getHeader(field);
    }
}
exports.DefaultTopicIncoming = DefaultTopicIncoming;
function parseTopicIncoming(init) {
    const incoming = (init.body ?? init.payload);
    incoming.id = init.id;
    incoming.topic = init.topic;
    incoming.headers = new headers_1.HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    return incoming;
}
let TopicIncomingFactory = class TopicIncomingFactory {
    constructor(streamAdapter) {
        this.streamAdapter = streamAdapter;
    }
    create(options) {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseTopicIncoming(options);
        }
        return new DefaultTopicIncoming(options);
    }
};
exports.TopicIncomingFactory = TopicIncomingFactory;
exports.TopicIncomingFactory = TopicIncomingFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [StreamAdapter_1.StreamAdapter])
], TopicIncomingFactory);
/**
 * client incoming packet
 */
let AbstractClientIncoming = class AbstractClientIncoming {
    get statusCode() {
        return this._status;
    }
    get status() {
        return this._status;
    }
    /**
      * Textual description of response status code, defaults to OK.
      *
      * Do not depend on this.
      */
    get statusText() {
        return this._message;
    }
    get statusMessage() {
        return this._message;
    }
    constructor(init, defaultStatus, defaultStatusText) {
        this.pattern = init.pattern;
        this.headers = new headers_1.HeaderMappings(init.headers);
        this.error = init.error;
        this.type = init.type;
        this.body = init.body ?? init.payload;
        this._status = init.status ?? init.statusCode ?? defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
        this.ok = this.isOk(init);
    }
    isOk(init) {
        return init.error ? false : init.ok != false;
    }
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field) {
        return this.headers.has(field);
    }
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field) {
        return this.headers.getHeader(field);
    }
};
exports.AbstractClientIncoming = AbstractClientIncoming;
exports.AbstractClientIncoming = AbstractClientIncoming = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [Object, Object, String])
], AbstractClientIncoming);
class UrlClientIncoming extends AbstractClientIncoming {
    constructor(init, defaultStatus, defaultStatusText) {
        super(init, defaultStatus, defaultStatusText);
        this.url = init.url;
    }
}
exports.UrlClientIncoming = UrlClientIncoming;
let UrlClientIncomingFactory = class UrlClientIncomingFactory {
    constructor(streamAdapter) {
        this.streamAdapter = streamAdapter;
    }
    create(options) {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseUrlClientIncoming(options);
        }
        return new UrlClientIncoming(options);
    }
};
exports.UrlClientIncomingFactory = UrlClientIncomingFactory;
exports.UrlClientIncomingFactory = UrlClientIncomingFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [StreamAdapter_1.StreamAdapter])
], UrlClientIncomingFactory);
function parseUrlClientIncoming(init, defaultStatus, defaultStatusText) {
    const incoming = (init.body ?? init.payload);
    incoming.url = init.url;
    incoming.headers = new headers_1.HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    incoming.status = init.status ?? init.statusCode ?? defaultStatus;
    incoming.statusText = init.statusText ?? init.statusMessage ?? defaultStatusText;
    incoming.body = incoming;
    return incoming;
}
class TopicClientIncoming extends AbstractClientIncoming {
    constructor(init, defaultStatus, defaultStatusText) {
        super(init, defaultStatus, defaultStatusText);
        this.topic = init.topic;
    }
}
exports.TopicClientIncoming = TopicClientIncoming;
function parseTopicClientIncoming(init, defaultStatus, defaultStatusText) {
    const incoming = (init.body ?? init.payload);
    incoming.topic = init.topic;
    incoming.headers = new headers_1.HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    incoming.status = init.status ?? init.statusCode ?? defaultStatus;
    incoming.statusText = init.statusText ?? init.statusMessage ?? defaultStatusText;
    incoming.body = incoming;
    return incoming;
}
let TopicClientIncomingFactory = class TopicClientIncomingFactory {
    constructor(streamAdapter) {
        this.streamAdapter = streamAdapter;
    }
    create(options) {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseTopicClientIncoming(options);
        }
        return new TopicClientIncoming(options);
    }
};
exports.TopicClientIncomingFactory = TopicClientIncomingFactory;
exports.TopicClientIncomingFactory = TopicClientIncomingFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [StreamAdapter_1.StreamAdapter])
], TopicClientIncomingFactory);
function provideIncomings() {
    return [
        UrlClientIncomingFactory,
        TopicClientIncomingFactory
    ];
}
//# sourceMappingURL=incoming.impl.js.map