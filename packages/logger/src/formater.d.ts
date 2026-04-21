import { Token } from '@tsdi/ioc';
import { JoinPoint } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';
/**
 * JoinPoint log formater logs
 */
export declare abstract class JoinPointFormater {
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
export declare class DefaultJoinPointFormater extends JoinPointFormater {
    protected timestamp(time: Date): any;
    format(joinPoint: JoinPoint, level: Level, logger: Logger, ...messages: any[]): any[];
}
