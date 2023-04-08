import { Injectable } from '@tsdi/ioc';
import { TransportContext } from '@tsdi/core';
import * as chalk from 'chalk';
import { ResponseStatusFormater } from './log';
import { StatusVaildator } from '../status';



@Injectable({ static: true })
export class DefaultStatusFormater extends ResponseStatusFormater {
    constructor(private vaildator: StatusVaildator) {
        super()
    }

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

        if (this.vaildator.isOk(status)) {
            return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : ''];
        }

        if (this.vaildator.isRedirect(status)) {
            return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : ''];
        }

        if (this.vaildator.isRequestFailed(status)) {
            return [chalk.magentaBright(status), statusMessage ? chalk.magentaBright(statusMessage) : '']
        }

        if (this.vaildator.isServerError(status)) {
            return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']
        }

        if (this.vaildator.isRetry(status)) {
            return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : ''];
        }

        return [chalk.cyan(status), statusMessage ? chalk.cyan(statusMessage) : '']

    }

}
