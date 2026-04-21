/**
 * Exception is Basic Error.
 * for custom extends.
 *
 * 异常处理基础类，用于基础实现自定义异常。
 */
export declare class Exception extends Error {
    readonly code?: any | undefined;
    constructor(message: string, code?: any | undefined);
}
/**
 * argument execption.
 *
 * 参数异常。
 */
export declare class ArgumentException extends Exception {
    constructor(message?: string | string[]);
}
/**
 * Type execption.
 *
 * 类型异常。
 */
export declare class TypeException extends Exception {
    constructor(message?: string);
}
