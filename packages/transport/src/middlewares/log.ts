import { ApplicationArguments, Middleware, TransportContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';

@Injectable()
export class LogMiddleware implements Middleware {

    constructor(private args: ApplicationArguments) { }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const logger: Logger = ctx.target?.logger ?? ctx.getValue(Logger) ?? ctx.get(LoggerManager).getLogger();

        const dev = !this.args.env.production;

        dev && logger.info('--------------->', ctx.url);

        try {
            await next();
            dev && logger.info('<---------------', ctx.url, ctx.status);
        } catch (err) {
            logger.error('<---------------', ctx.url, ctx.status, err);
            throw err;
        }
    }

}