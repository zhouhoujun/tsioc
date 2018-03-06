import { LogConfigure } from './LogConfigure';
import { Joinpoint, JoinpointState } from '../aop/index';
import { ILogger } from './ILogger';
import { Token } from '../types';
import { ILoggerManger } from './ILoggerManger';
import { isString, isBoolean, isNumber, isDate, isFunction, isBaseObject, symbols, isPromise } from '../utils/index';
import { Singleton } from '../core/index';
import { NonePointcut } from '../core/index';

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
                // let returnArg: string;
                // if (isString(joinPoint.returning)) {
                //     returnArg = joinPoint.returning;
                // } else if (isBoolean(joinPoint.returning)) {
                //     returnArg = joinPoint.returning ? 'true' : 'false';
                // // } else if (isNumber(joinPoint.returning) || isDate(joinPoint.returning) || isFunction(joinPoint.returning)) {
                // //     returnArg = joinPoint.returning.toString();
                // // } else if (isPromise(joinPoint.returning)) {
                // //     returnArg = joinPoint.returning.toString();
                // } else if (isBaseObject(joinPoint.returning)) {
                //     returnArg = JSON.stringify(joinPoint.returning);
                // }  else if (isFunction(joinPoint.returning)) {
                //     returnArg = joinPoint.returning.toString();
                // }

                return [joinPoint.fullName, joinPoint.returning || ''];

            case JoinpointState.AfterThrowing:
                // let errorMsg: string;
                // if (joinPoint.throwing instanceof Error) {
                //     errorMsg = joinPoint.throwing.stack || joinPoint.throwing.message;
                // } else if (isFunction(joinPoint.throwing.toString)) {
                //     errorMsg = joinPoint.throwing.toString();
                // } else {
                //     errorMsg = JSON.stringify(joinPoint.throwing);
                // }

                return [joinPoint.fullName, joinPoint.throwing || ''];

            default:
                return [];
        }
    }
}
