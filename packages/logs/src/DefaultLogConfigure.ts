import { LogConfigure } from './LogConfigure';
import { Token, Singleton, isString, isBoolean, isNumber, isDate, isFunction, isBaseObject, symbols, isPromise } from '@tsioc/core';
import { Joinpoint, JoinpointState, NonePointcut } from '@tsioc/aop';
import { ILogger } from './ILogger';
import { ILoggerManger } from './ILoggerManger';

@NonePointcut
@Singleton(symbols.LogConfigure)
export class DefaultLogConfigure implements LogConfigure {

    adapter: Token<ILoggerManger>;
    constructor(adapter?: Token<ILoggerManger>) {
        this.adapter = adapter || 'console';
    }

    format(joinPoint?: Joinpoint, logger?: ILogger) {
        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                return '%s invoke method "%s" with args %o.';

            case JoinpointState.After:
                return '%s  invoke method "%s".';

            case JoinpointState.AfterReturning:
                return 'Invoke method "%s" returning value %o.'

            case JoinpointState.AfterThrowing:
                return 'Invoke method "%s" throw error %o.'
            default:
                return '';
        }
    }

    formatArgs?(joinPoint?: Joinpoint, logger?: ILogger): any[] {
        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                return [joinPoint.state, joinPoint.fullName, joinPoint.args];

            case JoinpointState.After:
                return [joinPoint.state, joinPoint.fullName];

            case JoinpointState.AfterReturning:
                return [joinPoint.fullName, joinPoint.returningValue || ''];

            case JoinpointState.AfterThrowing:
                return [joinPoint.fullName, joinPoint.throwing || ''];

            default:
                return [];
        }
    }
}
