import { Exception, Injectable } from '@tsdi/ioc';
import * as chalk from 'chalk';
import { ResponseStatusFormater } from '@tsdi/common';



@Injectable({ static: true })
export class NodeResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';

    format(withColor: boolean, path: string, method?: string, hrtime?: [number, number], statusCode?: string | number | null, statusMessage?: string, contentLength?: number | null, error?: Exception): string[] {

        if (hrtime) {
            const [status, message] = statusCode ? this.formatStatus(withColor, statusCode, statusMessage) : this.formatState(withColor, error);
            const hrtimeStr = this.htime.format(hrtime);
            const sizeStr = this.formatSize(contentLength ?? 0);
            return [
                withColor ? chalk.gray(this.outgoing) : this.outgoing,
                withColor ? chalk.cyan(method ?? '') : method ?? '',
                path,
                status?.toString() ?? '',
                withColor ? chalk.gray(hrtimeStr) : hrtimeStr,
                withColor ? chalk.gray(sizeStr) : sizeStr,
                message
            ]
        } else {
            return [
                withColor ? chalk.gray(this.incoming) : this.incoming,
                withColor ? chalk.cyan(method ?? '') : method ?? '',
                path
            ]
        }
    }

    private formatState(withColor: boolean, error?: Exception): [string, string] {
        const status = error ? 'failed' : 'ok';
        const statusMessage = error?.message ?? '';

        if (!withColor) return [status, statusMessage];

        if (error) {
            return [chalk.red(status), statusMessage ? chalk.red(statusMessage) : '']
        }
        return [chalk.green(status), statusMessage ? chalk.green(statusMessage) : '']
    }

    private formatStatus(withColor: boolean, statusCode: number | string, statusMessage?: string): [string, string] {

        if (!withColor) return [statusCode?.toString(), statusMessage ?? '']

        const statusText = statusCode.toString();
        if (/^2(?:\.|\d)/.test(statusText)) {
            return [chalk.green(statusText), statusMessage ? chalk.green(statusMessage) : ''];
        }

        if (/^3(?:\.|\d)/.test(statusText)) {
            return [chalk.yellow(statusText), statusMessage ? chalk.yellow(statusMessage) : ''];
        }

        if (/^4(?:\.|\d)/.test(statusText)) {
            return [chalk.magentaBright(statusText), statusMessage ? chalk.magentaBright(statusMessage) : ''];
        }

        if (/^5(?:\.|\d)/.test(statusText)) {
            return [chalk.red(statusText), statusMessage ? chalk.red(statusMessage) : ''];
        }

        return [chalk.cyan(statusText), statusMessage ? chalk.cyan(statusMessage) : '']

    }

}
