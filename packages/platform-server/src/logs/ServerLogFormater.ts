import { Singleton, Refs } from '@tsdi/ioc';
import { Joinpoint, JoinpointState, NonePointcut } from '@tsdi/aop';
import { LogAspect, LogFormater, Level, Logger } from '@tsdi/logs';
import * as chalk from 'chalk';


@NonePointcut()
@Singleton()
@Refs(LogAspect, LogFormater)
export class ServerLogFormater extends LogFormater {

    timestamp(time: Date): any {
        return chalk.green(`[${time.toISOString()}]`)
    }

    format(joinPoint: Joinpoint, level: Level, logger: Logger, ...messages: any[]): any[] {

        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                messages = [
                    `${joinPoint.state} invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.gray('params:'),
                    joinPoint.params,
                    chalk.gray(', with args:'),
                    joinPoint.args,
                    ...messages
                ];
                break;
            case JoinpointState.After:
                messages.unshift(`${joinPoint.state}  invoke method ${chalk.cyan(joinPoint.fullName)}.`);
                break;
            case JoinpointState.AfterReturning:
                messages = [
                    `Invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.gray('returning value:'),
                    joinPoint.returning,
                    ...messages
                ];
                break;
            case JoinpointState.AfterThrowing:
                messages = [
                    `Invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.red('throw error:'),
                    joinPoint.throwing,
                    ...messages
                ];
                break;
            default:
                break
        }
        if (logger.formatHeader) {
            messages.unshift(chalk.green((logger.name || 'default') + ' -'));
            if (level) {
                messages.unshift(chalk.green(`[${level.toUpperCase()}]`))
            }
            const timestamp = this.timestamp(new Date());
            if (timestamp) messages.unshift(timestamp)
        }
        return messages
    }
}
