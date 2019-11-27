import { Singleton, InjectToken, Token } from '@tsdi/ioc';
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
     * @param {...any[]} messages
     * @returns {string}
     * @memberof ILogFormater
     */
    format(joinPoint: Joinpoint, ...messages: any[]): any[];

    timestamp?(time: Date): any;
}

/**
 * log formater
 */
export type LOGFormater = ILogFormater | Token<ILogFormater> | ((joinPoint?: Joinpoint, ...messages: any[]) => any[]) | string;


@NonePointcut()
@Singleton(LogFormaterToken)
export class LogFormater implements ILogFormater {

    constructor() {

    }

    timestamp(time: Date): any {
        return `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()} ${time.getMilliseconds()}`;
    }

    format(joinPoint?: Joinpoint, ...messages: any[]): any[] {
        // let pointMsg: string;
        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                messages = [
                    `${joinPoint.state} invoke method "${joinPoint.fullName}"\n`,
                    ` with args: `,
                    // joinPoint.params,
                    joinPoint.args,
                    '\n',
                    ...messages
                ];
                break;
            case JoinpointState.After:
                messages.unshift(`${joinPoint.state}  invoke method "${joinPoint.fullName}".\n`);
                break;
            case JoinpointState.AfterReturning:
                messages = [
                    `Invoke method "${joinPoint.fullName}"\n`,
                    ` returning value: `,
                    joinPoint.returningValue,
                    '\n',
                    ...messages
                ];
                break;
            case JoinpointState.AfterThrowing:
                messages = [
                    `Invoke method "${joinPoint.fullName}"\n`,
                    ` throw error: `,
                    joinPoint.throwing,
                    '\n',
                    ...messages
                ]
                break;
            default:
                break;
        }
        return messages;
    }
}
