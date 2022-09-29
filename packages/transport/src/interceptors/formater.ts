import { ConnectionContext, RedirectTransportStatus } from '@tsdi/core';
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
        const stat = transport.status;
        if (stat.isOk(status)) {
            return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : '']
        }

        if (stat instanceof RedirectTransportStatus && stat.isRedirect(status)) {
            return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : '']
        }

        if (stat.isRequestFailed(status)) {
            return [chalk.magentaBright(status), statusMessage ? chalk.magentaBright(statusMessage) : '']
        }

        if (stat.isServerError(status)) {
            return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']
        }

        return [chalk.cyan(status), statusMessage ? chalk.cyan(statusMessage) : '']
    }

}
