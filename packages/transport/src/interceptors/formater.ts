import { ConnectionContext, RestfulStrategy } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import * as chalk from 'chalk';
import { ResponseStatusFormater } from './log';



@Injectable({ static: true })
export class DefaultStatusFormater extends ResponseStatusFormater {

    format(ctx: ConnectionContext, hrtime: [number, number]): string[] {
        const [status, message] = this.formatStatus(ctx);
        return [
            status,
            this.formatHrtime(hrtime),
            this.formatSize(ctx.length),
            message
        ]
    }


    private formatStatus(ctx: ConnectionContext): [string, string] {
        const { status, transport, statusMessage } = ctx;

        if (transport.status.isOk(status)) {
            return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : '']
        }

        if (transport.status instanceof RestfulStrategy && transport.status.isRedirect(status)) {
            return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : '']
        }

        if (transport.status.isRequestFailed(status)) {
            return [chalk.magentaBright(status), statusMessage ? chalk.magentaBright(statusMessage) : '']
        }

        if (transport.status.isServerError(status)) {
            return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']
        }

        return [chalk.cyan(status), statusMessage ? chalk.cyan(statusMessage) : '']
    }

}
