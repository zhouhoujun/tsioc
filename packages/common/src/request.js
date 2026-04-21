"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTopicRequest = exports.BaseUrlRequest = exports.BaseRequest = exports.PatternRequest = exports.TopicRequest = exports.UrlRequest = exports.AbstractRequest = void 0;
exports.appendUrlParams = appendUrlParams;
const ioc_1 = require("@tsdi/ioc");
const headers_1 = require("./headers");
const params_1 = require("./params");
const utils_1 = require("./utils");
/**
 * Abstract request.
 */
class AbstractRequest {
    /**
     * request body, payload alias name.
     */
    get body() {
        return this.payload;
    }
}
exports.AbstractRequest = AbstractRequest;
/**
 * url request.
 */
class UrlRequest extends AbstractRequest {
}
exports.UrlRequest = UrlRequest;
/**
 * Topic request
 */
class TopicRequest extends AbstractRequest {
}
exports.TopicRequest = TopicRequest;
/**
 * Pattern request
 */
class PatternRequest extends AbstractRequest {
}
exports.PatternRequest = PatternRequest;
/**
 * Request packet.
 */
class BaseRequest extends AbstractRequest {
    /**
     * request body, payload alias name.
     */
    get body() {
        return this.payload;
    }
    constructor(initOptions, defaultMethod = '') {
        super();
        this.initOptions = initOptions;
        this.id = initOptions.id;
        this.headers = new headers_1.HeaderMappings(initOptions.headers);
        this.payload = initOptions.body ?? initOptions.payload ?? null;
        this.params = new params_1.RequestParams(initOptions);
        this.responseType = initOptions.responseType ?? 'json';
        this.forceJson = initOptions.responseType === 'json';
        this.observe = initOptions.observe ?? 'body';
        this.withCredentials = !!initOptions.withCredentials;
    }
    getExtentOptions() {
        return this.initOptions;
    }
    cloneOpts(update) {
        // The payload is somewhat special - a `null` value in update.payload means
        // whatever current payload is present is being overridden with an empty
        // payload, whereas an `undefined` value in update.payload implies no
        // override.
        let payload = (0, ioc_1.isUndefined)(update.payload) ? update.body : update.payload;
        if ((0, ioc_1.isUndefined)(payload)) {
            payload = this.payload;
        }
        // Headers and params may be appended to if `setHeaders` or
        // `setParams` are used.
        let headers;
        if (update.headers instanceof headers_1.HeaderMappings) {
            headers = update.headers;
        }
        else {
            headers = this.headers;
            update.headers && headers.setHeaders(update.headers);
        }
        // Check whether the caller has asked to add headers.
        if (update.setHeaders !== undefined) {
            // Set every requested header.
            headers =
                Object.keys(update.setHeaders)
                    .reduce((headers, name) => headers.set(name, update.setHeaders[name]), headers);
        }
        // `setParams` are used.
        let params;
        if (update.params) {
            params = update.params instanceof params_1.RequestParams ? update.params : new params_1.RequestParams(update);
        }
        else {
            params = this.params;
        }
        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams[param]), params);
        }
        const responseType = update.responseType ?? ((!this.forceJson && this.responseType == 'json') ? undefined : this.responseType);
        // Carefully handle the boolean options to differentiate between
        // `false` and `undefined` in the update args.
        const withCredentials = (update.withCredentials !== undefined) ? update.withCredentials : this.withCredentials;
        const id = this.id;
        const observe = update.observe ?? this.observe;
        return { id, headers, params, payload, withCredentials, responseType, observe };
    }
}
exports.BaseRequest = BaseRequest;
function appendUrlParams(url, reqParams) {
    // If no parameters have been passed in, construct a new HttpUrlEncodedParams instance.
    if (!reqParams.size) {
        return url;
    }
    else {
        // Encode the parameters to a string in preparation for inclusion in the URL.
        const params = reqParams.toString();
        if (params.length === 0) {
            // No parameters, the visible URL is just the URL given at creation time.
            return url;
        }
        else {
            // Does the URL already have query parameters? Look for '?'.
            const qIdx = url.indexOf('?');
            // There are 3 cases to handle:
            // 1) No existing parameters -> append '?' followed by params.
            // 2) '?' exists and is followed by existing query string ->
            //    append '&' followed by params.
            // 3) '?' exists at the end of the url -> append params directly.
            // This basically amounts to determining the character, if any, with
            // which to join the URL and parameters.
            const sep = qIdx === -1 ? '?' : (qIdx < url.length - 1 ? '&' : '');
            return url + sep + params;
        }
    }
}
/**
 * Base url request
 */
class BaseUrlRequest extends BaseRequest {
    constructor(url, pattern, init, defaultMethod = '') {
        super(init, defaultMethod);
        this.url = url;
        this.pattern = pattern;
        this.method = init.method ?? defaultMethod;
    }
    cloneOpts(update) {
        const opts = super.cloneOpts(update);
        opts.method = update.method ?? this.method;
        return opts;
    }
    /**
     * The outgoing URL with all URL parameters set.
     */
    getUrlWithParams() {
        return appendUrlParams(this.url, this.params);
    }
    /**
     * parse request to simple json.
     * @param optoions json format options
     * @returns
     */
    toJson(optoions) {
        const json = {
            url: this.getUrlWithParams()
        };
        if (this.id) {
            json.id = this.id;
        }
        if (this.pattern) {
            json.pattern = optoions?.formatter ? optoions.formatter.format(this.pattern) : this.pattern;
        }
        if (this.headers.size) {
            json.headers = this.headers.getHeaders();
        }
        if (!(0, ioc_1.isNil)(this.body)) {
            json[optoions?.payloadKey ?? 'body'] = this.body;
        }
        return json;
    }
}
exports.BaseUrlRequest = BaseUrlRequest;
class BaseTopicRequest extends BaseRequest {
    constructor(topic, pattern, init, defaultMethod = '') {
        super(init, defaultMethod);
        this.pattern = pattern;
        topic = (0, utils_1.normalize)(topic);
        this.topic = topic;
        this.responseTopic = this.getResponseTopic(topic, init);
    }
    getResponseTopic(topic, options) {
        return `${topic}/reply`;
    }
    /**
     * parse request to simple json.
     * @param optoions json format options
     * @returns
     */
    toJson(options) {
        const json = {
            topic: this.topic,
            responseTopic: this.responseTopic
        };
        if (this.id) {
            json.id = this.id;
        }
        if (this.pattern) {
            json.pattern = options?.formatter ? options.formatter.format(this.pattern) : this.pattern;
        }
        if (this.headers.size) {
            json.headers = this.headers.getHeaders();
        }
        if (!(0, ioc_1.isNil)(this.body)) {
            json[options?.payloadKey ?? 'payload'] = this.body;
        }
        return json;
    }
}
exports.BaseTopicRequest = BaseTopicRequest;
//# sourceMappingURL=request.js.map