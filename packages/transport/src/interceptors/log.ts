import { Abstract, Injectable, Nullable } from '@tsdi/ioc';
import { Interceptor, Handler, TransportContext } from '@tsdi/core';
import { Level, Log, Logger, matchLevel } from '@tsdi/logs';
import * as chalk from 'chalk';
import { Observable, map } from 'rxjs';
import { ResponseStatusFormater } from './status.formater';




@Abstract()
export abstract class LogInterceptorOptions {
    abstract get level(): Level;
}

const defopts = {
    level: 'debug'
} as LogInterceptorOptions;

/**
 * Log interceptor.
 */
@Injectable()
export class LogInterceptor implements Interceptor {

    private options: LogInterceptorOptions;
    @Log()
    private logger!: Logger;
    constructor(private formatter: ResponseStatusFormater, @Nullable() options: LogInterceptorOptions) {
        this.options = { ...defopts, ...options } as LogInterceptorOptions;
    }

    intercept(ctx: TransportContext, next: Handler): Observable<any> {
        const logger = this.logger;

        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(ctx);
        }

        //todo console log and other. need to refactor formater.
        const start = this.formatter.hrtime();
        const method = chalk.cyan(ctx.method);
        const url = ctx.url;
        logger[level](this.formatter.incoming, method, url);
        return next.handle(ctx)
            .pipe(
                map(res => {
                    logger[level](this.formatter.outgoing, method, url, ...this.formatter.format(ctx, this.formatter.hrtime(start)));
                    return res
                })
            )
    }

}
