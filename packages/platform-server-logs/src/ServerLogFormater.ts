import { Singleton, Refs } from '@tsdi/ioc';
import { Joinpoint, JoinpointState, NonePointcut } from '@tsdi/aop';
import { LoggerAspect, LogFormaterToken, ILogFormater } from '@tsdi/logs';
import chalk from 'chalk';


@NonePointcut()
@Singleton()
@Refs(LoggerAspect, LogFormaterToken)
export class ServerLogFormater implements ILogFormater {

    constructor() {

    }

    timestamp(time: Date): any {
        return '[' + chalk.gray(`${time.getHours()}:${time.getMinutes()}:${time.getSeconds()} ${time.getMilliseconds()}`) + ']'
    }

    format(joinPoint: Joinpoint, ...messages: any[]): any[] {

        switch (joinPoint.state) {
            case JoinpointState.Before:
            case JoinpointState.Pointcut:
                messages = [
                    `${joinPoint.state} invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.gray(' params: '),
                    joinPoint.params,
                    chalk.gray(' with args: '),
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
                    chalk.gray(' returning value: '),
                    joinPoint.returningValue,
                    ...messages
                ]
                break;
            case JoinpointState.AfterThrowing:
                messages = [
                    `Invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.red(' throw error: '),
                    joinPoint.throwing,
                    ...messages
                ]
                break;
            default:
                break;
        }
        return messages;
    }
}
