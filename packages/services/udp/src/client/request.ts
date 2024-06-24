import { isString } from '@tsdi/ioc';
import { Pattern, PatternRequest, RequestInitOpts } from '@tsdi/common';
import { isIPv4 } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';
import { udpUrl$ } from '../consts';


export interface UdpRequestInitOpts<T = any> extends RequestInitOpts<T> {
    remoteInfo?: RemoteInfo;
    baseUrl?: string;
}

export class UdpRequest<T = any> extends PatternRequest<T> {

    readonly remoteInfo: RemoteInfo;
    constructor(pattern: Pattern, options: UdpRequestInitOpts<T>) {
        super(pattern, options);
        if (options.remoteInfo) {
            this.remoteInfo = options.remoteInfo;
        } else {
            const host = isString(pattern) && udpUrl$.test(pattern) ? pattern : options.baseUrl!;
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
}
