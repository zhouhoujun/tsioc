import { Token, Singleton, isString, isSymbol, isBoolean, IParameter, isNumber, isDate, isFunction, symbols, isPromise, isArray, isObject, isBaseType, getClassName, isClass, isBaseObject } from '@ts-ioc/core';
import { Joinpoint, JoinpointState, NonePointcut } from '@ts-ioc/aop';
import { ILogger } from './ILogger';
import { LogSymbols } from './symbols';

/**
 * log formater logs
 *
 * @export
 * @interface ILogFormater
 */
export interface ILogFormater {
    /**
     * format message.
     *
     * @param {Joinpoint} [joinPoint]
     * @param {string} [message]
     * @returns {string}
     * @memberof ILogFormater
     */
    format(joinPoint?: Joinpoint, message?: string): string;
}

/**
 * log formater
 */
export type LOGFormater = ILogFormater | ((joinPoint?: Joinpoint, message?: string) => string) | string;


@NonePointcut()
@Singleton(LogSymbols.LogFormater, 'default')
export class LogFormater {

    constructor() {

    }

    format(joinPoint?: Joinpoint, message?: string): string {
        let pointMsg: string;
        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                pointMsg = `${joinPoint.state} invoke method "${joinPoint.fullName}" with args ${this.stringifyArgs(joinPoint.params, joinPoint.args)}.`;
                break;
            case JoinpointState.After:
                pointMsg = `${joinPoint.state}  invoke method "${joinPoint.fullName}".`;
                break;
            case JoinpointState.AfterReturning:
                pointMsg = `Invoke method "${joinPoint.fullName}" returning value ${this.stringify(joinPoint.returningValue)}.`;
                break;
            case JoinpointState.AfterThrowing:
                pointMsg = `Invoke method "${joinPoint.fullName}" throw error ${this.stringify(joinPoint.throwing)}.`;
                break;
            default:
                pointMsg = '';
                break;
        }

        return this.joinMessage([pointMsg, message]);

    }

    protected stringifyArgs(params: IParameter[], args: any[]) {
        let argsStr = params.map((p, idx) => {
            let arg = args.length >= idx ? args[idx] : null;
            return `<param name: "${p.name || ''}", param type: "${this.stringify(p.type)}"> ${this.stringify(arg)}`;
        }).join(', ');
        if (argsStr) {
            return this.joinMessage(['[', argsStr, ']'], ' ');
        } else {
            return '[]';
        }
    }

    protected joinMessage(messgs: any[], separator = '; ') {
        return messgs.filter(a => a).map(a => isString(a) ? a : a.toString()).join(separator);
    }

    protected stringifyArray(args: any[]): string {
        if (!args.length) {
            return '[]';
        }
        return '[ ' + args.map(arg => this.stringify(arg)).join(', ') + ' ]';
    }

    protected stringify(target: any): string {
        if (isString(target)) {
            return target;
        } else if (isArray(target)) {
            return this.stringifyArray(target);
        } else if (isBaseType(target)) {
            return target;
        } else if (isClass(target)) {
            return `[class ${getClassName(target)}]`;
        } else if (isFunction(target) || isDate(target) || isSymbol(target)) {
            return target.toString();
        } else if (isObject(target)) {
            try {
                return JSON.stringify(target);
            } catch {
                if (isFunction(target.toString)) {
                    return target.toString();
                }
            }
        }

        return '';
    }
}
