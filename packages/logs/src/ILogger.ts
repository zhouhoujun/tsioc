

/**
 * logger interface
 *
 * @export
 * @interface ILogger
 */
export interface ILogger {
    level: string;

    log(...args: any[]): void;

    trace(message: string, ...args: any[]): void;

    debug(message: string, ...args: any[]): void;

    info(message: string, ...args: any[]): void;

    warn(message: string, ...args: any[]): void;

    error(message: string, ...args: any[]): void;

    fatal(message: string, ...args: any[]): void;

}
