import { ServerEndpointContext, States } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import * as chalk from 'chalk';
import { ResponseStatusFormater } from './log';



@Injectable({ static: true })
export class DefaultStatusFormater extends ResponseStatusFormater {

    format(ctx: ServerEndpointContext, hrtime: [number, number]): string[] {
        const [status, message] = this.formatStatus(ctx);
        return [
            status,
            this.formatHrtime(hrtime),
            this.formatSize(ctx.length),
            message
        ]
    }


    private formatStatus(ctx: ServerEndpointContext): [string, string] {
        const { state, status, statusMessage } = ctx;


        switch (state) {
            case States.Ok:
                return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : ''];

            case States.Redirect:
                return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : ''];

            case States.requestFailed:
                return [chalk.magentaBright(status), statusMessage ? chalk.magentaBright(statusMessage) : '']

            case States.InternalServerError:
                return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']

            default:
                return [chalk.cyan(status), statusMessage ? chalk.cyan(statusMessage) : '']
        }

    }

}
