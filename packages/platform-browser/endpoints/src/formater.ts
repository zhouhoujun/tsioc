import { Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { RequestStatusContext, ResponseStatusFormater } from '@tsdi/endpoints';
import hrtime = require('browser-process-hrtime');

@Injectable({ static: true })
export class BrowserResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';

    hrtime(time?: [number, number] | undefined): [number, number] {
        return hrtime(time);
    }

    format(logger: Logger, ctx: RequestStatusContext, hrtime?: [number, number]): string[] {
        const [status, message] = this.formatStatus(ctx);
        return hrtime ? [
            this.outgoing,
            ctx.method,
            ctx.url,
            status,
            this.formatHrtime(hrtime),
            this.formatSize(ctx.length),
            message
        ] : [
            this.incoming,
            ctx.method,
            ctx.url
        ]
    }

    private formatStatus(ctx: RequestStatusContext): [string, string] {
        const { status, statusMessage } = ctx;
        return [String(status), statusMessage];
    }

}
