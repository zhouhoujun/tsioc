import { Abstract, Singleton, Token } from '@tsdi/ioc';
import { Joinpoint, JoinpointState, NonePointcut } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';



/**
 * log formater logs
 */
@Abstract()
export abstract class LogFormater {
    /**
     * format message.
     *
     * @param {Joinpoint} joinPoint
     * @param {Level} level
     * @param {Logger} logger
     * @param {...any[]} messages
     * @returns {string}
     */
    abstract format(joinPoint: Joinpoint, level: Level, logger: Logger, ...messages: any[]): any[];
}

/**
 * log formater
 */
export type LOGFormater = LogFormater | Token<LogFormater> | ((joinPoint?: Joinpoint, ...messages: any[]) => any[]) | string;


@NonePointcut()
@Singleton()
export class DefaultLogFormater extends LogFormater {

    protected timestamp(time: Date): any {
        return `[${time.toISOString()}]`;
    }

    format(joinPoint: Joinpoint, level: Level, logger: Logger, ...messages: any[]): any[] {
        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                messages = [
                    `${joinPoint.state} invoke method "${joinPoint.fullName}".`,
                    'params:',
                    joinPoint.params,
                    ', with args: ',
                    joinPoint.args,
                    ...messages
                ];
                break;
            case JoinpointState.After:
                messages.unshift(`${joinPoint.state}  invoke method "${joinPoint.fullName}".`);
                break;
            case JoinpointState.AfterReturning:
                messages = [
                    `Invoke method "${joinPoint.fullName}".`,
                    'returning value:',
                    joinPoint.returning,
                    ...messages
                ];
                break;
            case JoinpointState.AfterThrowing:
                messages = [
                    `Invoke method "${joinPoint.fullName}".`,
                    'throw error:',
                    joinPoint.throwing,
                    ...messages
                ]
                break;
            default:
                break;
        }
        if (logger.formatHeader) {
            messages.unshift((logger.name || 'default') + ' -')
            if (level) {
                messages.unshift(`[${level.toUpperCase()}]`)
            }
            let timestamp = this.timestamp(new Date());
            if (timestamp) messages.unshift(timestamp);
        }
        return messages;
    }
}
