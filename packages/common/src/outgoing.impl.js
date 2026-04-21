"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicOutgoingFactory = exports.TopicOutgoing = exports.UrlOutgoingFactory = exports.UrlOutgoing = exports.PatternOutgoingFactory = exports.PatternOutgoing = exports.AbstractOutgoing = exports.OutgoingFactory = exports.AbstractOutgoingFactory = void 0;
exports.parsePatternOutgoing = parsePatternOutgoing;
exports.parseUrlOutgoing = parseUrlOutgoing;
exports.parseTopicOutgoing = parseTopicOutgoing;
exports.provideOutgoings = provideOutgoings;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const headers_1 = require("./headers");
const StreamAdapter_1 = require("./StreamAdapter");
/**
 * Abstract outgoing factory.
 */
let AbstractOutgoingFactory = class AbstractOutgoingFactory {
};
exports.AbstractOutgoingFactory = AbstractOutgoingFactory;
exports.AbstractOutgoingFactory = AbstractOutgoingFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AbstractOutgoingFactory);
/**
 * Outgoing factory.
 */
let OutgoingFactory = class OutgoingFactory {
};
exports.OutgoingFactory = OutgoingFactory;
exports.OutgoingFactory = OutgoingFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], OutgoingFactory);
/**
 * abstract server outgoing.
 */
let AbstractOutgoing = class AbstractOutgoing {
    constructor(init, defaultStatus, defaultStatusText) {
        this.pattern = init.pattern;
        this.id = init.id ?? init.incoming?.id;
        this.headers = new headers_1.HeaderMappings(init.headers);
        this._ok = init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status !== undefined ? init.status : defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
    }
    get ok() {
        return this._ok;
    }
    get error() {
        return this._error;
    }
    set error(err) {
        if (err) {
            this._ok = false;
            if (err instanceof ioc_1.Exception) {
                this.statusCode = err.code;
                this.statusMessage = err.message;
            }
        }
        this._error = err;
    }
    get statusCode() {
        return this._status;
    }
    set statusCode(code) {
        this._status = code;
    }
    get status() {
        return this._status;
    }
    set status(code) {
        this._status = code;
    }
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    set statusText(text) {
        this._message = text;
    }
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText() {
        return this._message;
    }
    set statusMessage(message) {
        this._message = message;
    }
    get statusMessage() {
        return this._message;
    }
    hasHeader(field) {
        return this.headers.has(field);
    }
    getHeader(field) {
        return this.headers.getHeader(field);
    }
    setHeader(field, val) {
        this.headers.setHeader(field, val);
    }
    removeHeader(field) {
        this.headers.removeHeader(field);
    }
};
exports.AbstractOutgoing = AbstractOutgoing;
exports.AbstractOutgoing = AbstractOutgoing = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [Object, Object, String])
], AbstractOutgoing);
/**
 * Pattern outgoing
 */
class PatternOutgoing extends AbstractOutgoing {
    constructor(init) {
        super(init);
        this.pattern = init.pattern;
    }
    /**
     * parse url outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns
     */
    toJson(payloadKey = 'body') {
        const json = {
            pattern: this.pattern,
            ok: this.ok,
        };
        if (this.id) {
            json.id = this.id;
        }
        if (this.pattern) {
            json.pattern = this.pattern;
        }
        if (this.headers.size) {
            json.headers = this.headers.getHeaders();
        }
        if (!(0, ioc_1.isNil)(this.status)) {
            json.status = this.status;
        }
        if (!(0, ioc_1.isNil)(this.statusCode)) {
            json.statusCode = this.statusCode;
        }
        if (!(0, ioc_1.isNil)(this.error)) {
            json.error = this.error;
        }
        if (this.statusMessage) {
            json.statusMessage = this.statusMessage;
        }
        if (!(0, ioc_1.isNil)(this.body)) {
            json[payloadKey] = this.body;
        }
        return json;
    }
}
exports.PatternOutgoing = PatternOutgoing;
function parsePatternOutgoing(init) {
    const outgoing = (init.body ?? init.payload);
    outgoing.id = init.id;
    outgoing.pattern = init.pattern;
    outgoing.headers = new headers_1.HeaderMappings(init.headers);
    outgoing.status = init.status ?? init.statusCode;
    outgoing.statusMessage = init.statusMessage ?? init.statusText;
    return outgoing;
}
let PatternOutgoingFactory = class PatternOutgoingFactory {
    constructor(streamAdapter) {
        this.streamAdapter = streamAdapter;
    }
    create(options) {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parsePatternOutgoing(options);
        }
        return new PatternOutgoing(options);
    }
};
exports.PatternOutgoingFactory = PatternOutgoingFactory;
exports.PatternOutgoingFactory = PatternOutgoingFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [StreamAdapter_1.StreamAdapter])
], PatternOutgoingFactory);
/**
 * Url outgoing
 */
class UrlOutgoing extends AbstractOutgoing {
    constructor(init) {
        super(init);
        this.url = init.url;
    }
    /**
     * parse url outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns
     */
    toJson(payloadKey = 'body') {
        const json = {
            url: this.url,
            ok: this.ok,
        };
        if (this.id) {
            json.id = this.id;
        }
        if (this.pattern) {
            json.pattern = this.pattern;
        }
        if (this.headers.size) {
            json.headers = this.headers.getHeaders();
        }
        if (!(0, ioc_1.isNil)(this.status)) {
            json.status = this.status;
        }
        if (!(0, ioc_1.isNil)(this.statusCode)) {
            json.statusCode = this.statusCode;
        }
        if (!(0, ioc_1.isNil)(this.error)) {
            json.error = this.error;
        }
        if (this.statusMessage) {
            json.statusMessage = this.statusMessage;
        }
        if (!(0, ioc_1.isNil)(this.body)) {
            json[payloadKey] = this.body;
        }
        return json;
    }
}
exports.UrlOutgoing = UrlOutgoing;
function parseUrlOutgoing(init) {
    const outgoing = (init.body ?? init.payload);
    outgoing.id = init.id;
    outgoing.url = init.url;
    outgoing.headers = new headers_1.HeaderMappings(init.headers);
    outgoing.pattern = init.pattern;
    outgoing.status = init.status ?? init.statusCode;
    outgoing.statusMessage = init.statusMessage ?? init.statusText;
    return outgoing;
}
let UrlOutgoingFactory = class UrlOutgoingFactory {
    constructor(streamAdapter) {
        this.streamAdapter = streamAdapter;
    }
    create(options) {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parseUrlOutgoing(options);
        }
        return new UrlOutgoing(options);
    }
};
exports.UrlOutgoingFactory = UrlOutgoingFactory;
exports.UrlOutgoingFactory = UrlOutgoingFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [StreamAdapter_1.StreamAdapter])
], UrlOutgoingFactory);
/**
 * Topic outgoing
 */
class TopicOutgoing extends AbstractOutgoing {
    constructor(init) {
        super(init);
        this.topic = init.topic;
    }
    /**
     * parse topic outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns
     */
    toJson(payloadKey = 'body') {
        const json = {
            topic: this.topic,
            ok: this.ok,
        };
        if (this.id) {
            json.id = this.id;
        }
        if (this.pattern) {
            json.pattern = this.pattern;
        }
        if (this.headers.size) {
            json.headers = this.headers.getHeaders();
        }
        if (!(0, ioc_1.isNil)(this.status)) {
            json.status = this.status;
        }
        if (!(0, ioc_1.isNil)(this.statusCode)) {
            json.statusCode = this.statusCode;
        }
        if (!(0, ioc_1.isNil)(this.error)) {
            json.error = this.error;
        }
        if (this.statusMessage) {
            json.statusMessage = this.statusMessage;
        }
        if (!(0, ioc_1.isNil)(this.body)) {
            json[payloadKey] = this.body;
        }
        return json;
    }
}
exports.TopicOutgoing = TopicOutgoing;
function parseTopicOutgoing(init) {
    const outgoing = (init.body ?? init.payload);
    outgoing.id = init.id;
    outgoing.topic = init.topic;
    outgoing.headers = new headers_1.HeaderMappings(init.headers);
    outgoing.pattern = init.pattern;
    outgoing.status = init.status ?? init.statusCode;
    outgoing.statusMessage = init.statusMessage ?? init.statusText;
    return outgoing;
}
let TopicOutgoingFactory = class TopicOutgoingFactory {
    constructor(streamAdapter) {
        this.streamAdapter = streamAdapter;
    }
    create(options) {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parseTopicOutgoing(options);
        }
        return new TopicOutgoing(options);
    }
};
exports.TopicOutgoingFactory = TopicOutgoingFactory;
exports.TopicOutgoingFactory = TopicOutgoingFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [StreamAdapter_1.StreamAdapter])
], TopicOutgoingFactory);
function provideOutgoings() {
    return [
        PatternOutgoingFactory,
        UrlOutgoingFactory,
        TopicOutgoingFactory
    ];
}
//# sourceMappingURL=outgoing.impl.js.map