import { Level } from './Level';
import { Type, Token, ObjectMap } from '@ts-ioc/core';
import { Joinpoint } from '@ts-ioc/aop';
import { ILoggerManger } from './ILoggerManger';
import { ILogger } from './ILogger';
import { LOGFormater } from './LogFormater';


/**
 * log configure. config logger format, looger adapter.
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
     */
    format?: LOGFormater;
}
