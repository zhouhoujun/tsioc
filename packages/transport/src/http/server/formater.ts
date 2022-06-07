import { TransportContext } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import * as chalk from 'chalk';
import { ResponseStatusFormater } from '../../interceptors/log';
import { emptyStatus, redirectStatus } from '../status';



@Injectable()
export class HttpStatusFormater extends ResponseStatusFormater {

    format(ctx: TransportContext<any, any>, hrtime: [number, number]): string[] {
        return [
            this.formatStatus(ctx.status), 
            this.formatHrtime(hrtime), 
            this.formatSize(ctx.length), 
            this.formatMessage(ctx.status, ctx.statusMessage)
        ]
    }
    

    private formatStatus(status: number) {
        if (emptyStatus[status]) {
            return chalk.yellow(status)
        }
        if (redirectStatus[status]) {
            return chalk.blue(status)
        }
        if (status === 200) {
            return chalk.green(status)
        }

        if (status >= 500) {
            return chalk.red(status)
        } else if (status > 300) {
            return chalk.yellow(status)
        } else if (status > 200) {
            return chalk.cyan(status)
        }
        return chalk.gray(status)
    }

    private formatMessage(status: number, msg: string) {
        if (!msg || !isString(msg)) return ''
        if (status >= 500) {
            return chalk.red(msg)
        } else if (status >= 400) {
            return chalk.redBright(msg)
        } else if (status >= 300) {
            return chalk.yellow(msg)
        } else if (status === 200) {
            return chalk.green(msg)
        }
        return chalk.gray(msg)
    }

}

