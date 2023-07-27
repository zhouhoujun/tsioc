import { Injectable } from '@tsdi/ioc';
import { Logger, ConsoleLog } from '@tsdi/logger';
import { AssetContext, ResponseStatusFormater } from '@tsdi/transport';
import * as chalk from 'chalk';
import { hrtime } from 'process';



@Injectable({ static: true })
export class NodeResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';


    hrtime(time?: [number, number] | undefined): [number, number] {
        return hrtime(time);
    }

    format(logger: Logger, ctx: AssetContext, hrtime?: [number, number]): string[] {
        return this.formatWithColor(logger instanceof ConsoleLog, ctx, hrtime);
    }

    protected formatWithColor(withColor: boolean, ctx: AssetContext, hrtime?: [number, number]) {
        if (hrtime) {
            const [status, message] = this.formatStatus(ctx, withColor);
            const hrtimeStr = this.formatHrtime(hrtime);
            const sizeStr = this.formatSize(ctx.length);
            return [
                withColor ? chalk.gray(this.outgoing) : this.outgoing,
                withColor ? chalk.cyan(ctx.method) : ctx.method,
                ctx.url,
                status,
                withColor ? chalk.gray(hrtimeStr) : hrtimeStr,
                withColor ? chalk.gray(sizeStr) : sizeStr,
                message
            ]
        } else {
            return [
                withColor ? chalk.gray(this.incoming) : this.incoming,
                withColor ? chalk.cyan(ctx.method) : ctx.method,
                ctx.url
            ]
        }
    }

    private formatStatus(ctx: AssetContext, withColor: boolean): [string, string] {
        const { status, statusMessage } = ctx;
        if (!withColor) return [status, statusMessage ?? ''];

        const vaildator = ctx.vaildator;

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
