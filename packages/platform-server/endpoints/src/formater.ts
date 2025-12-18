import { Exception, hasProps, Injectable } from '@tsdi/ioc';
import * as chalk from 'chalk';
import { StatusAdapter, ResponseStatusFormater } from '@tsdi/common';



@Injectable({ static: true })
export class NodeResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';

    format(adapter: StatusAdapter, withColor: boolean, path: string, method?: string, hrtime?: [number, number], statusCode?: string | number | null, statusMessage?: string, contentLength?: number | null, error?: Exception): string[] {

        if (hrtime) {
            const [status, message] = statusCode ? this.formatStatus(adapter, withColor, statusCode, statusMessage) : this.formatState(withColor, error);
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

    private formatStatus(adapter: StatusAdapter, withColor: boolean, statusCode: number | string, statusMessage?: string): [string, string] {

        if (!withColor) return [statusCode?.toString(), statusMessage ?? '']

        if (adapter.isOk(statusCode)) {
            return [chalk.green(statusCode), statusMessage ? chalk.green(statusMessage) : ''];
        }

        if (adapter.isRedirect(statusCode)) {
            return [chalk.yellow(statusCode), statusMessage ? chalk.yellow(statusMessage) : ''];
        }

        if (adapter.isRequestFailed(statusCode)) {
            return [chalk.magentaBright(statusCode), statusMessage ? chalk.magentaBright(statusMessage) : '']
        }

        if (adapter.isServerError(statusCode)) {
            return [chalk.red(statusCode), statusMessage ? chalk.red(statusMessage) : '']
        }

        if (adapter.isRetry(statusCode)) {
            return [chalk.yellow(statusCode), statusMessage ? chalk.yellow(statusMessage) : ''];
        }

        return [chalk.cyan(statusCode), statusMessage ? chalk.cyan(statusMessage) : '']

    }

}
