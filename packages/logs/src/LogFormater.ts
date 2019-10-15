import {
    Singleton, isString, isNull, IParameter, isDate, isFunction,
    isArray, isClass, InjectToken, lang, Token
} from '@tsdi/ioc';
import { Container } from '@tsdi/core';
import { Joinpoint, JoinpointState, NonePointcut } from '@tsdi/aop';


/**
 * Log formater interface token.
 * it is a token id, you can register yourself formater for log.
 */
export const LogFormaterToken = new InjectToken<ILogFormater>('DI_LogFormater');

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
export type LOGFormater = ILogFormater | Token<ILogFormater> | ((joinPoint?: Joinpoint, message?: string) => string) | string;


@NonePointcut()
@Singleton(LogFormaterToken)
export class LogFormater implements ILogFormater {

    constructor() {

    }

    format(joinPoint?: Joinpoint, message?: string): string {
        let pointMsg: string;
        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                pointMsg = `${joinPoint.state} invoke method "${joinPoint.fullName}"\n  with args: ${this.stringifyArgs(joinPoint.params, joinPoint.args)}.\n`;
                break;
            case JoinpointState.After:
                pointMsg = `${joinPoint.state}  invoke method "${joinPoint.fullName}".\n`;
                break;
            case JoinpointState.AfterReturning:
                pointMsg = `Invoke method "${joinPoint.fullName}"\n  returning value: ${this.stringify(joinPoint.returningValue)}.\n`;
                break;
            case JoinpointState.AfterThrowing:
                pointMsg = `Invoke method "${joinPoint.fullName}"\n  throw error: ${this.stringify(joinPoint.throwing)}.\n`;
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
            return `    <param name: "${p.name || ''}"> ${this.stringify(arg)}`;
        }).join(',\n');
        if (argsStr) {
            return this.joinMessage(['  [\n', argsStr, '\n]'], '');
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
        return '[\n' + args.map(arg => this.stringify(arg)).join(',\n') + '\n].';
    }

    protected stringify(target: any): string {
        let type = typeof target;
        let str = '';
        switch (type) {
            case 'string':
                str = `"${target}"`;
                break;
            case 'boolean':
                str = target.toString();
                break;
            case 'number':
                str = target.toString();
                break;
            case 'symbol':
                str = target.toString();
                break;
            case 'object':
                if (isNull(target)) {
                    str = 'null';
                } else if (isArray(target)) {
                    str = this.stringifyArray(target);
                } else if (isDate(target)) {
                    str = `[Date: ${target.toString()}]`;
                } else if (target instanceof Container) {
                    str = `[${lang.getClassName(target)}]`;
                } else {
                    str = `[${lang.getClassName(target)}: ${this.toJsonString(target)}]`;
                }
                break;
            default:
                if (isClass(target)) {
                    str = `[class: ${lang.getClassName(target)}]`;
                } else if (isFunction(target)) {
                    str = `[function: ${lang.getClassName(target)}]`;
                }
                break;
        }

        return str;
    }

    protected toJsonString(target: any) {
        try {
            return JSON.stringify(target);
        } catch (err) {
            return 'object';
        }
    }
}
