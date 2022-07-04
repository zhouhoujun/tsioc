import { Injectable, isString } from '@tsdi/ioc';
import { ResponseStatusFormater } from '../../interceptors/log';
import { TcpContext } from './context';
import * as chalk from 'chalk';

/**
 * status formater.
 */
@Injectable()
export class TcpStatusFormater extends ResponseStatusFormater {

    format(ctx: TcpContext, hrtime: [number, number]): string[] {
        return [
            this.formatStatus(ctx.status), 
            this.formatHrtime(hrtime), 
            this.formatSize(ctx.length), 
            this.formatMessage(ctx.status, ctx.statusMessage)
        ]
    }
    

    private formatStatus(status: number) {

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
