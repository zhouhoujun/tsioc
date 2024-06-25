import { InvocationContext, isString } from '@tsdi/ioc';
import { HeadersLike, Pattern, PatternRequest, RequestInitOpts, RequestParams } from '@tsdi/common';
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
            let host = isString(pattern) && udpUrl$.test(pattern) ? pattern : options.baseUrl!;
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

    clone(): PatternRequest<T>;
    clone(update: {
        headers?: HeadersLike;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        remoteInfo?:RemoteInfo;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        withCredentials?: boolean;
        timeout?: number | null;
    }): PatternRequest<T>
    clone<V>(update: {
        headers?: HeadersLike;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        remoteInfo?:RemoteInfo;
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        withCredentials?: boolean;
        timeout?: number | null;
    }): PatternRequest<V>;
    clone(update: {
        headers?: HeadersLike;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        remoteInfo?:RemoteInfo;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        withCredentials?: boolean;
        timeout?: number | null;
    } = {}): PatternRequest {
        const pattern = update.pattern || this.pattern;
        const options = this.cloneOpts(update) as UdpRequestInitOpts;
        options.remoteInfo = update.remoteInfo ?? this.remoteInfo;
        // Finally, construct the new HttpRequest using the pieces from above.
        return new PatternRequest(pattern, options)
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }

}
