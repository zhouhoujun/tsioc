import { Refs, Static } from '@tsdi/ioc';
import { Joinpoint, JoinpointState, NonePointcut } from '@tsdi/aop';
import { LogAspect, JoinpointFormater, Level, Logger, DefaultJoinpointFormater, ConsoleLog } from '@tsdi/logger';
import * as chalk from 'chalk';


@NonePointcut()
@Static()
@Refs(LogAspect, JoinpointFormater)
export class ServerJoinpointLogFormater extends DefaultJoinpointFormater {


    format(joinPoint: Joinpoint, level: Level, logger: Logger, ...messages: any[]): any[] {
        if (!(logger instanceof ConsoleLog)) {
            return super.format(joinPoint, level, logger, ...messages);
        }
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

        return messages
    }
}

