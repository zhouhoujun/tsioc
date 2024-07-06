import { isString } from '@tsdi/ioc';
import { BaseRequest, Pattern, RequestCloneOpts, RequestInitOpts } from '@tsdi/common';
import { isIPv4 } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';
import { udpUrl$ } from '../consts';


export interface UdpRequestInitOpts<T = any> extends RequestInitOpts<T> {
    remoteInfo?: RemoteInfo;
    baseUrl?: string;
}

export class UdpRequest<T> extends BaseRequest<T> {
    readonly pattern: Pattern;
    readonly remoteInfo: RemoteInfo;
    constructor(options: UdpRequestInitOpts<T>) {
        super(options);
        this.pattern = options.pattern!;
        if (options.remoteInfo) {
            this.remoteInfo = options.remoteInfo;
        } else {
            let host = isString(this.pattern) && udpUrl$.test(this.pattern) ? this.pattern : options.baseUrl!;
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
        remoteInfo?:RemoteInfo;
    } & RequestCloneOpts<V>): UdpRequest<V>;
    clone(update: {
        remoteInfo?:RemoteInfo;
    } & RequestCloneOpts<T>): UdpRequest<T>;
    clone(update: {
        remoteInfo?:RemoteInfo;
    } & RequestCloneOpts<any> = {}): UdpRequest<any> {
        const options = this.cloneOpts(update) as UdpRequestInitOpts;
        options.remoteInfo = update.remoteInfo ?? this.remoteInfo;
        // Finally, construct the new HttpRequest using the pieces from above.
        return new UdpRequest(options)
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }

}
