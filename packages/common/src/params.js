"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestParams = exports.URI_COMPONENT_CODER = exports.EMPTY_CODER = void 0;
exports.eachRawParams = eachRawParams;
exports.parseQueryString = parseQueryString;
const ioc_1 = require("@tsdi/ioc");
/**
 * empty coder.
 */
exports.EMPTY_CODER = {
    encodeKey(key) {
        return key;
    },
    encodeValue(value) {
        return value;
    },
    decodeKey(key) {
        return key;
    },
    decodeValue(value) {
        return value;
    }
};
exports.URI_COMPONENT_CODER = {
    encodeKey(key) {
        return key;
    },
    encodeValue(value) {
        return encodeURIComponent(value);
    },
    decodeKey(key) {
        return key;
    },
    decodeValue(value) {
        return decodeURIComponent(value);
    }
};
/**
 * request parameters.
 */
class RequestParams {
    constructor(options = {}) {
        this.encoder = options.encoder ?? exports.EMPTY_CODER;
        this.map = new Map();
        if (options.params instanceof RequestParams) {
            if (!options.encoder) {
                this.encoder = options.params.encoder;
            }
            options.params.map.forEach((v, k) => {
                this.map.set(k, v.slice(0));
            });
        }
        else if ((0, ioc_1.isString)(options.params)) {
            this.parse(options.params);
        }
        else if ((0, ioc_1.isArray)(options.params)) {
            options.params.forEach(pair => {
                const [key, value] = pair;
                this.map.set(key, [parseString(value)]);
            });
        }
        else if ((0, ioc_1.isPlainObject)(options.params)) {
            Object.keys(options.params).forEach(key => {
                const value = options.params[key];
                this.map?.set(key, (0, ioc_1.isArray)(value) ? value.map(v => parseString(v)) : [parseString(value)]);
            });
        }
    }
    get size() {
        return this.map.size;
    }
    /**
     * Reports whether the body includes one or more values for a given parameter.
     * @param param The parameter name.
     * @returns True if the parameter has one or more values,
     * false if it has no value or is not present.
     */
    has(param) {
        return this.map.has(param);
    }
    /**
     * Retrieves the first value for a parameter.
     * @param param The parameter name.
     * @returns The first value of the given parameter,
     * or `null` if the parameter is not present.
     */
    get(param) {
        const res = this.map.get(param);
        return res ? res[0] : null;
    }
    /**
     * Retrieves all values for a  parameter.
     * @param param The parameter name.
     * @returns All values in a string array,
     * or `null` if the parameter not present.
     */
    getAll(param) {
        return this.map.get(param) || null;
    }
    /**
     * Appends a new value to existing values for a parameter.
     * @param param The parameter name.
     * @param value The new value to add.
     * @return A new body with the appended value.
     */
    append(param, value) {
        const all = this.getAll(param);
        if (all) {
            if ((0, ioc_1.isArray)(value)) {
                all.push(...value.map(v => parseString(v)));
            }
            else {
                all.push(parseString(value));
            }
        }
        else {
            this.map.set(param, (0, ioc_1.isArray)(value) ? value.map(v => parseString(v)) : [parseString(value)]);
        }
        this._query = null;
        return this;
    }
    /**v
     * Constructs a new body with appended values for the given parameter name.
     * @param params parameters and values
     * @return A new body with the new value.
     */
    appendAll(params) {
        Object.keys(params).forEach(param => {
            const value = params[param];
            this.append(param, value);
        });
        return this;
    }
    /**
     * Replaces the value for a parameter.
     * @param param The parameter name.
     * @param value The new value.
     * @return A new body with the new value.
     */
    set(param, value) {
        this.map.set(param, [parseString(value)]);
        this._query = null;
        return this;
    }
    /**
     * Removes a given value or all values from a parameter.
     * @param param The parameter name.
     * @param value The value to remove, if provided.
     * @return A new body with the given value removed, or with all values
     * removed if no value is specified.
     */
    delete(param, value) {
        if ((0, ioc_1.isNil)(value)) {
            this.map.delete(param);
        }
        else {
            const values = this.getAll(param);
            if (values) {
                values.splice(values.indexOf(parseString(value)), 1);
            }
        }
        this._query = null;
        return this;
    }
    /**
     * Retrieves all the parameters for this body.
     * @returns The parameter names in a string array.
     */
    keys() {
        return Array.from(this.map.keys());
    }
    /**
     * Serializes the body to an encoded string, where key-value pairs (separated by `=`) are
     * separated by `&`s.
     */
    toString() {
        return this.keys()
            .map(key => {
            const eKey = this.encoder.encodeKey(key);
            // `a: ['1']` produces `'a=1'`
            // `b: []` produces `''`
            // `c: ['1', '2']` produces `'c=1&c=2'`
            return this.map?.get(key).map(value => eKey + '=' + this.encoder.encodeValue(value))
                .join('&');
        })
            // filter out empty values because `b: []` produces `''`
            // which results in `a=1&&c=1&c=2` instead of `a=1&c=1&c=2` if we don't
            .filter(param => param !== '')
            .join('&');
    }
    toRecord() {
        return this.keys()
            .reduce((pre, key) => {
            const val = this.map.get(key);
            pre[key] = (0, ioc_1.isArray)(val) ? (val.length == 1 ? val[0] : val) : val;
            return pre;
        }, {});
    }
    getQuery() {
        if (!this._query) {
            this._query = this.toRecord();
        }
        return this._query;
    }
    parse(rawParams) {
        const map = this.map;
        eachRawParams(rawParams, (key, val) => {
            const list = map.get(key) ?? [];
            list.push(val);
            map.set(key, list);
        }, this.encoder);
    }
}
exports.RequestParams = RequestParams;
function eachRawParams(rawParams, each, encoder = exports.URI_COMPONENT_CODER) {
    if (rawParams.length > 0) {
        const params = rawParams.replace(/^\?/, '').split('&');
        params.forEach((param) => {
            const eqIdx = param.indexOf('=');
            const [key, val] = eqIdx == -1 ?
                [encoder.decodeKey(param), ''] :
                [encoder.decodeKey(param.slice(0, eqIdx)), encoder.decodeValue(param.slice(eqIdx + 1))];
            each(key, val);
        });
    }
}
function parseQueryString(rawParams, encoder) {
    const query = {};
    eachRawParams(rawParams, (key, val) => {
        query[key] = val;
    }, encoder);
    return query;
}
function parseString(value) {
    return `${value}`;
}
//# sourceMappingURL=params.js.map