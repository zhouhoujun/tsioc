import { Abstract, InjectFlags, Injectable, Nullable } from '@tsdi/ioc';
import { Interceptor, Handler, Filter } from '@tsdi/core';
import { Level, InjectLog, Logger, matchLevel } from '@tsdi/logger';
import { Observable, map } from 'rxjs';
import { ResponseStatusFormater } from './status.formater';
import { RequestContext } from '../RequestContext';




@Abstract()
export abstract class LogInterceptorOptions {
    abstract get level(): Level;
}

const defopts = {
    level: 'debug'
} as LogInterceptorOptions;

/**
 * Log interceptor, filter.
 */
@Injectable()
export class LogInterceptor implements Interceptor, Filter {

    private options: LogInterceptorOptions;

    @InjectLog()
    private logger!: Logger;

    constructor(private formatter: ResponseStatusFormater, @Nullable() options: LogInterceptorOptions) {
        this.options = { ...defopts, ...options } as LogInterceptorOptions;
    }

    intercept(ctx: RequestContext, next: Handler): Observable<any> {
        const logger = ctx.get(Logger, InjectFlags.Self) ?? this.logger;

        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(ctx);
        }

        //todo console log and other. need to refactor formater.
        const start = this.formatter.hrtime();
        logger[level](...this.formatter.format(logger, ctx));
        return next.handle(ctx)
            .pipe(
                map(res => {
                    logger[level](...this.formatter.format(logger, ctx, this.formatter.hrtime(start)));
                    return res
                })
            )
    }

}
