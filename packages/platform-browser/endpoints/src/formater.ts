import { hasProps, Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { AbstractRequestContext, ResponseStatusFormater } from '@tsdi/endpoints';


@Injectable({ static: true })
export class BrowserResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';

    format(logger: Logger, ctx: AbstractRequestContext, hrtime?: [number, number]): string[] {
        const [status, message] = this.formatStatus(ctx);
        return hrtime ? [
            this.outgoing,
            ctx.method ?? '',
            ctx.url,
            ctx.query && hasProps(ctx.query) ? `params: ${JSON.stringify(ctx.query)}` : '',
            status,
            this.htime.format(hrtime),
            this.formatSize(ctx.length),
            message
        ] : [
            this.incoming,
            ctx.method ?? '',
            ctx.url,
            ctx.query && hasProps(ctx.query) ? `params: ${JSON.stringify(ctx.query)}` : '',
        ]
    }

    private formatStatus(ctx: AbstractRequestContext): [string, string] {
        const { status, statusMessage } = ctx;
        return [String(status), statusMessage];
    }

}
