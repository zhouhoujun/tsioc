import { Abstract, Static, Token } from '@tsdi/ioc';
import { Joinpoint, JoinpointState, NonePointcut } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';



/**
 * Joinpoint log formater logs
 */
@Abstract()
export abstract class JoinpointFormater {
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
 * Joinpoint log formater
 */
export type LOGFormater = JoinpointFormater | Token<JoinpointFormater> | ((joinPoint?: Joinpoint, ...messages: any[]) => any[]) | string;


@NonePointcut()
@Static()
export class DefaultJoinpointFormater extends JoinpointFormater {

    protected timestamp(time: Date): any {
        return `[${time.toISOString()}]`
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
                break
        }
        
        return messages
    }
}
