import { OkStatus, RedirectStatus, RequestFailedStatus, RetryStatus, ServerEndpointContext, ServerFailedStatus } from '@tsdi/core';
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
        const { status } = ctx;

        if (status instanceof OkStatus) {
            return [chalk.green(status), status.statusText ? chalk.green(status.statusText) : ''];
        }

        if (status instanceof RedirectStatus) {
            return [chalk.yellow(status), status.statusText ? chalk.yellow(status.statusText) : ''];
        }

        if (status instanceof RequestFailedStatus) {
            return [chalk.magentaBright(status), status.statusText ? chalk.magentaBright(status.statusText) : '']
        }

        if (status instanceof ServerFailedStatus) {
            return [chalk.red(status), status.statusText ? chalk.red(status.statusText) : '']
        }

        if (status instanceof RetryStatus) {
            return [chalk.yellow(status), status.statusText ? chalk.yellow(status.statusText) : ''];
        }

        return [chalk.cyan(status), status.statusText ? chalk.cyan(status.statusText) : '']


    }

}
