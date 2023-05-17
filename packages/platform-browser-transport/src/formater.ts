import { Injectable } from '@tsdi/ioc';
import { AssetContext } from '@tsdi/core';
import { ResponseStatusFormater } from '@tsdi/transport';
import hrtime = require('browser-process-hrtime');

@Injectable({ static: true })
export class BrowserResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';

    hrtime(time?: [number, number] | undefined): [number, number] {
        return hrtime(time);
    }

    format(ctx: AssetContext, hrtime: [number, number]): string[] {
        const [status, message] = this.formatStatus(ctx);
        return [
            status,
            this.formatHrtime(hrtime),
            this.formatSize(ctx.length),
            message
        ]
    }


    private formatStatus(ctx: AssetContext): [string, string] {
        const { status, statusMessage } = ctx;
        return [status, statusMessage];

        // if (this.vaildator.isOk(status)) {
        //     return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : ''];
        // }

        // if (this.vaildator.isRedirect(status)) {
        //     return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : ''];
        // }

        // if (this.vaildator.isRequestFailed(status)) {
        //     return [chalk.magentaBright(status), statusMessage ? chalk.magentaBright(statusMessage) : '']
        // }

        // if (this.vaildator.isServerError(status)) {
        //     return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']
        // }

        // if (this.vaildator.isRetry(status)) {
        //     return [chalk.yellow(status), statusMessage ? chalk.yellow(statusMessage) : ''];
        // }

        // return [chalk.cyan(status), statusMessage ? chalk.cyan(statusMessage) : '']

    }

}
