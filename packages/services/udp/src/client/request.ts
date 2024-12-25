import { BaseUrlRequest, Pattern, RequestCloneOpts, RequestInitOpts, UrlRequestOptions } from '@tsdi/common';
import { isIPv4 } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';
import { udpUrl$ } from '../consts';


export interface UdpRequestOptions<T = any> extends UrlRequestOptions<T> {
    remoteInfo?: RemoteInfo;
    baseUrl?: string;
}

export class UdpRequest<T> extends BaseUrlRequest<T, UdpRequestOptions> {
    readonly remoteInfo: RemoteInfo;

    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, UdpRequestOptions>, defaultMethod = '') {
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
    clone<V>(update: RequestCloneOpts<V, UdpRequestOptions>): UdpRequest<V>;
    clone(update: RequestCloneOpts<T, UdpRequestOptions>): UdpRequest<T>;
    clone(update: RequestCloneOpts<any, UdpRequestOptions> = {}): UdpRequest<any> {
        const init = this.cloneOpts(update);
        init.remoteInfo = update.remoteInfo ?? this.remoteInfo;
        // Finally, construct the new HttpRequest using the pieces from above.
        return new UdpRequest(update.url ?? this.url, this.pattern, init)
    }

}
