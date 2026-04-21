/**
 * Parameter Codec
 */
export interface ParameterCodec {
    encodeKey(key: string): string;
    encodeValue(value: string): string;
    decodeKey(key: string): string;
    decodeValue(value: string): string;
}
/**
 * empty coder.
 */
export declare const EMPTY_CODER: ParameterCodec;
export declare const URI_COMPONENT_CODER: ParameterCodec;
/**
 * request parameters.
 */
export declare class RequestParams {
    private map;
    private encoder;
    constructor(options?: {
        params?: RequestParams | string | ReadonlyArray<[string, string | number | boolean]> | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
        encoder?: ParameterCodec;
    });
    get size(): number;
    /**
     * Reports whether the body includes one or more values for a given parameter.
     * @param param The parameter name.
     * @returns True if the parameter has one or more values,
     * false if it has no value or is not present.
     */
    has(param: string): boolean;
    /**
     * Retrieves the first value for a parameter.
     * @param param The parameter name.
     * @returns The first value of the given parameter,
     * or `null` if the parameter is not present.
     */
    get(param: string): string | null;
    /**
     * Retrieves all values for a  parameter.
     * @param param The parameter name.
     * @returns All values in a string array,
     * or `null` if the parameter not present.
     */
    getAll(param: string): string[] | null;
    /**
     * Appends a new value to existing values for a parameter.
     * @param param The parameter name.
     * @param value The new value to add.
     * @return A new body with the appended value.
     */
    append(param: string, value: string | number | boolean | ReadonlyArray<string | number | boolean>): this;
    /**v
     * Constructs a new body with appended values for the given parameter name.
     * @param params parameters and values
     * @return A new body with the new value.
     */
    appendAll(params: {
        [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
    }): this;
    /**
     * Replaces the value for a parameter.
     * @param param The parameter name.
     * @param value The new value.
     * @return A new body with the new value.
     */
    set(param: string, value: string | number | boolean): this;
    /**
     * Removes a given value or all values from a parameter.
     * @param param The parameter name.
     * @param value The value to remove, if provided.
     * @return A new body with the given value removed, or with all values
     * removed if no value is specified.
     */
    delete(param: string, value?: string | number | boolean): this;
    /**
     * Retrieves all the parameters for this body.
     * @returns The parameter names in a string array.
     */
    keys(): string[];
    /**
     * Serializes the body to an encoded string, where key-value pairs (separated by `=`) are
     * separated by `&`s.
     */
    toString(): string;
    toRecord(): Record<string, any>;
    private _query?;
    getQuery(): Record<string, any>;
    protected parse(rawParams: string): void;
}
export declare function eachRawParams(rawParams: string, each: (key: string, value: string) => void, encoder?: ParameterCodec): void;
export declare function parseQueryString(rawParams: string, encoder?: ParameterCodec): Record<string, string>;
export type RequestParamsLike = RequestParams | string | ReadonlyArray<[string, string | number | boolean]> | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
