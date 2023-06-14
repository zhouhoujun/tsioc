import { Injectable } from '@tsdi/ioc';
import { AssetContext } from '@tsdi/core';
import { StatusVaildator, ResponseStatusFormater } from '@tsdi/transport';
import * as chalk from 'chalk';
import { hrtime } from 'process';



@Injectable({ static: true })
export class NodeResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = chalk.gray('--->');
    readonly outgoing = chalk.gray('<---');


    hrtime(time?: [number, number] | undefined): [number, number] {
        return hrtime(time);
    }

    format(ctx: AssetContext, hrtime: [number, number]): string[] {
        const [status, message] = this.formatStatus(ctx);
        return [
            status,
            chalk.gray(this.formatHrtime(hrtime)),
            chalk.gray(this.formatSize(ctx.length)),
            message
        ]
    }


    private formatStatus(ctx: AssetContext): [string, string] {
        const { status, statusMessage } = ctx;
        const vaildator= ctx.get(StatusVaildator);

        if (vaildator.isOk(status)) {
            return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : ''];
        }

        if (vaildator.isRedirect(status)) {
            return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : ''];
        }

        if (vaildator.isRequestFailed(status)) {
            return [chalk.magentaBright(status), statusMessage ? chalk.magentaBright(statusMessage) : '']
        }

        if (vaildator.isServerError(status)) {
            return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']
        }

        if (vaildator.isRetry(status)) {
            return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : ''];
        }

        return [chalk.cyan(status), statusMessage ? chalk.cyan(statusMessage) : '']

    }

}
