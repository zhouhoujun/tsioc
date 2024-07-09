import { BaseUrlRequest, Pattern, RequestInitOpts, UrlRequestCloneOpts } from '@tsdi/common';
import { isIPv4 } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';
import { udpUrl$ } from '../consts';


export interface UdpRequestInitOpts<T = any> extends RequestInitOpts<T> {
    remoteInfo?: RemoteInfo;
    baseUrl?: string;
}

export class UdpRequest<T> extends BaseUrlRequest<T> {
    readonly remoteInfo: RemoteInfo;

    constructor(url: string, pattern: Pattern | null | undefined, init: UdpRequestInitOpts<T>, defaultMethod = '') {
        super(url, pattern, init, defaultMethod);
        if (init.remoteInfo) {
            this.remoteInfo = init.remoteInfo;
        } else {
            let host = (pattern || !udpUrl$.test(url))? init.baseUrl! : url;
            host = new URL(host).host;
            const idx = host.lastIndexOf(':');
            const port = parseInt(host.substring(idx + 1));
            const address = host.substring(0, idx);
            this.remoteInfo = {
                address,
                family: isIPv4(address) ? 'IPv4' : 'IPv6',
                port
            } as RemoteInfo;
        }
    }

    clone(): UdpRequest<T>;
    clone<V>(update: {
        remoteInfo?: RemoteInfo;
    } & UrlRequestCloneOpts<V>): UdpRequest<V>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & UrlRequestCloneOpts<T>): UdpRequest<T>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & UrlRequestCloneOpts<any> = {}): UdpRequest<any> {
        const init = this.cloneOpts(update) as UdpRequestInitOpts;
        init.remoteInfo = update.remoteInfo ?? this.remoteInfo;
        // Finally, construct the new HttpRequest using the pieces from above.
        return new UdpRequest(update.url ?? this.url, this.pattern, init)
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }

}
