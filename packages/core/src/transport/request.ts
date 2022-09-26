import { EMPTY_OBJ, InvocationContext, isArray, isNil, isNumber, isPlainObject, isString } from '@tsdi/ioc';
import { IncomingHeaders, ReqHeaders } from './headers';
import { Message, RequestMethod } from './packet';


export interface ParameterCodec {
    encodeKey(key: string): string;
    encodeValue(value: string): string;

    decodeKey(key: string): string;
    decodeValue(value: string): string;
}

export const EMPTY_CODER = {
    encodeKey(key: string): string {
        return key
    },
    encodeValue(value: string): string {
        return value
    },

    decodeKey(key: string): string {
        return key
    },
    decodeValue(value: string): string {
        return value
    }
} as ParameterCodec;

/**
 * transport parameters.
 */
export class TransportParams {
    private map: Map<string, string[]>;
    private encoder: ParameterCodec;
    constructor(options: {
        params?: TransportParams | string
        | ReadonlyArray<[string, string | number | boolean]>
        | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
        encoder?: ParameterCodec;
    } = {}) {
        this.encoder = options.encoder ?? EMPTY_CODER;
        this.map = new Map<string, string[]>();
        if (options.params instanceof TransportParams) {
            if (!options.encoder) {
                this.encoder = options.params.encoder;
            }
            options.params.map.forEach((v, k) => {
                this.map.set(k, v.slice(0));
            });
        } else if (isString(options.params)) {
            this.parse(options.params)
        } else if (isArray(options.params)) {
            options.params.forEach(pair => {
                const [key, value] = pair;
                this.map.set(key, [parseString(value)])
            });
        } else if (isPlainObject(options.params)) {
            Object.keys(options.params).forEach(key => {
                const value = (options.params as any)[key];
                this.map!.set(key, isArray(value) ? value.map(v => parseString(v)) : [parseString(value)])
            })
        }
    }

    /**
     * Reports whether the body includes one or more values for a given parameter.
     * @param param The parameter name.
     * @returns True if the parameter has one or more values,
     * false if it has no value or is not present.
     */
    has(param: string): boolean {
        return this.map.has(param)
    }

    /**
     * Retrieves the first value for a parameter.
     * @param param The parameter name.
     * @returns The first value of the given parameter,
     * or `null` if the parameter is not present.
     */
    get(param: string): string | null {
        const res = this.map.get(param);
        return res ? res[0] : null
    }

    /**
     * Retrieves all values for a  parameter.
     * @param param The parameter name.
     * @returns All values in a string array,
     * or `null` if the parameter not present.
     */
    getAll(param: string): string[] | null {
        return this.map.get(param) || null
    }

    /**
     * Appends a new value to existing values for a parameter.
     * @param param The parameter name.
     * @param value The new value to add.
     * @return A new body with the appended value.
     */
    append(param: string, value: string | number | boolean | ReadonlyArray<string | number | boolean>): this {
        const all = this.getAll(param);
        if (all) {
            if (isArray(value)) {
                all.push(...value.map(v => parseString(v)));
            } else {
                all.push(parseString(value as any));
            }
        } else {
            this.map.set(param, isArray(value) ? value.map(v => parseString(v)) : [parseString(value as any)])
        }
        return this
    }

    /**v
     * Constructs a new body with appended values for the given parameter name.
     * @param params parameters and values
     * @return A new body with the new value.
     */
    appendAll(params: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> }): this {
        Object.keys(params).forEach(param => {
            const value = params[param];
            this.append(param, value);
        });
        return this
    }

    /**
     * Replaces the value for a parameter.
     * @param param The parameter name.
     * @param value The new value.
     * @return A new body with the new value.
     */
    set(param: string, value: string | number | boolean): this {
        this.map.set(param, [parseString(value)]);
        return this;
    }

    /**
     * Removes a given value or all values from a parameter.
     * @param param The parameter name.
     * @param value The value to remove, if provided.
     * @return A new body with the given value removed, or with all values
     * removed if no value is specified.
     */
    delete(param: string, value?: string | number | boolean): this {
        if (isNil(value)) {
            this.map.delete(param);
        } else {
            const values = this.getAll(param);
            if (values) {
                values.splice(values.indexOf(parseString(value)), 1);
            }
        }
        return this;
    }

    /**
     * Retrieves all the parameters for this body.
     * @returns The parameter names in a string array.
     */
    keys(): string[] {
        return Array.from(this.map.keys())
    }

    /**
     * Serializes the body to an encoded string, where key-value pairs (separated by `=`) are
     * separated by `&`s.
     */
    toString(): string {
        return this.keys()
            .map(key => {
                const eKey = this.encoder.encodeKey(key);
                // `a: ['1']` produces `'a=1'`
                // `b: []` produces `''`
                // `c: ['1', '2']` produces `'c=1&c=2'`
                return this.map!.get(key)!.map(value => eKey + '=' + this.encoder.encodeValue(value))
                    .join('&')
            })
            // filter out empty values because `b: []` produces `''`
            // which results in `a=1&&c=1&c=2` instead of `a=1&c=1&c=2` if we don't
            .filter(param => param !== '')
            .join('&')
    }

    protected parse(rawParams: string) {
        const map = this.map;
        if (rawParams.length > 0) {
            const params = rawParams.replace(/^\?/, '').split('&');
            params.forEach((param: string) => {
                const eqIdx = param.indexOf('=');
                const [key, val]: string[] = eqIdx == -1 ?
                    [this.encoder.decodeKey(param), ''] :
                    [this.encoder.decodeKey(param.slice(0, eqIdx)), this.encoder.decodeValue(param.slice(eqIdx + 1))];
                const list = map.get(key) || [];
                list.push(val);
                map.set(key, list)
            })
        }
    }

}

function parseString(value: string | number | boolean): string {
    return `${value}`
}

export interface CommandPattern {
    [key: string]: string | number;
    cmd: string;
}

export interface ObjectPattern {
    [key: string]: string | number | ObjectPattern;
}

export type Pattern = string | number | CommandPattern | ObjectPattern;

/**
 * Client Request.
 */
export class TransportRequest<T = any> implements Message<ReqHeaders, T> {

    readonly url: string;
    readonly method: string | undefined;
    readonly pattern?: Pattern;
    readonly params: TransportParams;
    public body: T | null;
    readonly headers: ReqHeaders;

    constructor(pattern: Pattern, option: RequestOptions = EMPTY_OBJ) {
        this.url = patternToPath(pattern);
        this.pattern = pattern;
        this.method = option.method;
        this.params = new TransportParams(option);
        this.body = option.body ?? option.playload ?? null;
        this.headers = new ReqHeaders(option.headers ?? option.options);
    }

}

/**
 * Transforms the Pattern to Route.
 * 1. If Pattern is a `string`, it will be returned as it is.
 * 2. If Pattern is a `number`, it will be converted to `string`.
 * 3. If Pattern is a `JSON` object, it will be transformed to Route. For that end,
 * the function will sort properties of `JSON` Object and creates `route` string
 * according to the following template:
 * <key1>:<value1>/<key2>:<value2>/.../<keyN>:<valueN>
 *
 * @param  {Pattern} pattern - client pattern
 * @returns string
 */
export function patternToPath(pattern: Pattern): string {
    if (isString(pattern) || isNumber(pattern)) {
        return `${pattern}`;
    }
    if (!isPlainObject(pattern)) {
        return pattern;
    }

    const sortedKeys = Object.keys(pattern).sort((a, b) => a.localeCompare(b));

    // Creates the array of Pattern params from sorted keys and their corresponding values
    const sortedPatternParams = sortedKeys.map(key => {
        let partialRoute = `"${key}":`;
        partialRoute += isString(pattern[key])
            ? `"${patternToPath(pattern[key])}"`
            : patternToPath(pattern[key]);
        return partialRoute;
    });

    const route = sortedPatternParams.join(',');
    return `{${route}}`;
}

/**
 * restful request option.
 */
export interface RequestOptions {
    /**
     * request method.
     */
    method?: RequestMethod;
    /**
     * request body.
     */
    body?: any;
    /**
     * alias name of body
     */
    playload?: any;
    /**
     * alias name of headers
     */
    options?: IncomingHeaders | ReqHeaders;
    /**
     * headers of request.
     */
    headers?: IncomingHeaders | ReqHeaders;
    /**
     * request context.
     */
    context?: InvocationContext;
    /**
     * request params.
     */
    params?: TransportParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    encoder?: ParameterCodec;
}

