import { TransportContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import * as chalk from 'chalk';
import { ResponseStatusFormater } from './log';



@Injectable()
export class DefaultStatusFormater extends ResponseStatusFormater {

    format(ctx: TransportContext, hrtime: [number, number]): string[] {
        const [status, message] = this.formatStatus(ctx);
        return [
            status,
            this.formatHrtime(hrtime),
            this.formatSize(ctx.length),
            message
        ]
    }


    private formatStatus(ctx: TransportContext): [string, string] {
        const { status, statusMessage } = ctx;

        if (ctx.protocol.status.isOk(status)) {
            return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : '']
        }

        if (ctx.protocol.status.isRedirect(status)) {
            return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : '']
        }

        if (ctx.protocol.status.isRequestFailed(status)) {
            return [chalk.magentaBright(status), statusMessage ? chalk.magentaBright(statusMessage) : '']
        }

        if (ctx.protocol.status.isServerError(status)) {
            return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']
        }

        return [chalk.cyan(status), statusMessage ? chalk.cyan(statusMessage) : '']
    }

}
