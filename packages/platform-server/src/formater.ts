import { Static } from '@tsdi/ioc';
import { HeaderFormater } from '@tsdi/logs';
import * as chalk from 'chalk';

/**
 * log header formater.
 */
@Static()
export class LogHeaderFormater extends HeaderFormater {
    format(name: string, level: string): string[] {
        return [this.timestamp(new Date()), chalk.green(`[${level}]`), chalk.green(name), chalk.green('-')];
    }

    timestamp(time: Date): any {
        return chalk.green(`[${time.toISOString()}]`)
    }

}
