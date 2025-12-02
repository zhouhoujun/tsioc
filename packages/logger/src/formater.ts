import { Abstract, Static, Token } from '@tsdi/ioc';
import { JoinPoint, JoinpointState, NonePointcut } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';



/**
 * JoinPoint log formater logs
 */
@Abstract()
export abstract class JoinPointFormater {
    /**
     * format message.
     *
     * @param {JoinPoint} joinPoint
     * @param {Level} level
     * @param {Logger} logger
     * @param {...any[]} messages
     * @returns {string}
     */
    abstract format(joinPoint: JoinPoint, level: Level, logger: Logger, ...messages: any[]): any[];
}

/**
 * JoinPoint log formater
 */
export type LOGFormater = JoinPointFormater | Token<JoinPointFormater> | ((joinPoint?: JoinPoint, ...messages: any[]) => any[]);


@NonePointcut()
@Static()
export class DefaultJoinPointFormater extends JoinPointFormater {

    protected timestamp(time: Date): any {
        return `[${time.toISOString()}]`
    }

    format(joinPoint: JoinPoint, level: Level, logger: Logger, ...messages: any[]): any[] {
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
