import { Type, Token, ObjectMap } from '@tsioc/core';
import { ILoggerManger } from './ILoggerManger';
import { ILogger } from './ILogger';
import { Joinpoint } from '@tsioc/aop';

/**
 * log configure.
 *
 * @export
 * @interface LogConfigure
 */
export interface LogConfigure {
    /**
     * log adapter
     *
     * @type {Token<ILoggerManger>)}
     * @memberof LogConfigure
     */
    adapter: Token<ILoggerManger>,

    /**
     * logger config options.
     *
     * @type {ObjectMap<any>}
     * @memberof LogConfigure
     */
    config?: ObjectMap<any>;

    /**
     * format
     *
     * @memberof LogConfigure
     */
    format?(joinPoint?: Joinpoint, logger?: ILogger): string;

    /**
     * format args.
     *
     * @param {Joinpoint} [joinPoint]
     * @param {ILogger} [logger]
     * @returns {any[]}
     * @memberof LogConfigure
     */
    formatArgs?(joinPoint?: Joinpoint, logger?: ILogger): any[];

    /**
     * custom format log message.
     *
     * @param {Joinpoint} joinPoint
     * @param {ILogger} logger
     * @memberof LogConfigure
     */
    customFormat?(joinPoint: Joinpoint, logger: ILogger);
}
