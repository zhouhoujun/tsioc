import { Exception, Injectable } from '@tsdi/ioc';
import { ResponseStatusFormater } from '@tsdi/common';


@Injectable({ static: true })
export class BrowserResponseStatusFormater extends ResponseStatusFormater {

    readonly incoming = '--->';
    readonly outgoing = '<---';

    format(_withColor: boolean, path: string, method?: string, hrtime?: [number, number], statusCode?: string | number | null, statusMessage?: string, contentLength?: number | null, error?: Exception): string[] {
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
