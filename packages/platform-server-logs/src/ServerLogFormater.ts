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
                    `${joinPoint.state} invoke method ${chalk.cyan(joinPoint.fullName)}\n`,
                    chalk.gray(' with args: '),
                    // joinPoint.params,
                    joinPoint.args,
                    '\n',
                    ...messages
                ];
                break;
            case JoinpointState.After:
                messages.unshift(`${joinPoint.state}  invoke method ${chalk.cyan(joinPoint.fullName)}.\n`);
                break;
            case JoinpointState.AfterReturning:
                messages = [
                    `Invoke method ${chalk.cyan(joinPoint.fullName)}\n`,
                    chalk.gray(` returning value: `),
                    joinPoint.returningValue,
                    '\n',
                    ...messages
                ]
                break;
            case JoinpointState.AfterThrowing:
                messages = [
                    `Invoke method ${chalk.cyan(joinPoint.fullName)}\n`,
                    chalk.red(` throw error: `),
                    joinPoint.throwing ? chalk.red(joinPoint.throwing.track) : '',
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
