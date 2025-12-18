import { Exception, hasProps, Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { ResponseStatusFormater, StatusAdapter } from '@tsdi/common';


@Injectable({ static: true })
export class BrowserResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';

    format(adapter: StatusAdapter, withColor: boolean, path: string, method?: string, hrtime?: [number, number], statusCode?: string | number | null, statusMessage?: string, contentLength?: number | null, error?: Exception): string[] {
        const [status, message] = this.formatStatus(statusCode, statusMessage, error);
        return hrtime ? [
            this.outgoing,
            method ?? '',
            path,
            status,
            this.htime.format(hrtime),
            this.formatSize(contentLength),
            message
        ] : [
            this.incoming,
            method ?? '',
            path
        ]
    }

    private formatStatus(statusCode?: number | string | null, statusMessage?: string, error?: Exception): [string, string] {
        return [String(statusCode ?? error?.code ?? ''), statusMessage ?? error?.message ?? ''];
    }

}
