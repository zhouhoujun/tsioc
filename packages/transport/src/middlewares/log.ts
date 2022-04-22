import { ApplicationArguments, Middleware, TransportContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Logger, LoggerFactory } from '@tsdi/logs';

@Injectable()
export class LogMiddleware implements Middleware {

    constructor(private args: ApplicationArguments) { }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const logger: Logger = ctx.target?.logger ?? ctx.getValue(Logger) ?? ctx.get(LoggerFactory).getLogger();

        const dev = !this.args.env.production;


        dev && logger.log(ctx.url);

        try {
            await next();
            dev && logger.log(ctx.url);
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

}