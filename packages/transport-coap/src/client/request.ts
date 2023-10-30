import { Injectable, Optional, isArray, isNil } from '@tsdi/ioc';
import { IncomingHeader, TransportEvent, TransportRequest } from '@tsdi/common';
import {
    Decoder, Encoder, IEndable, Redirector, StatusVaildator, StreamAdapter, Incoming,
    MimeAdapter, MimeTypes, StatusPacket, hdr, StreamRequestAdapter, ev, isBuffer, ctype
} from '@tsdi/transport';
import { request } from 'coap';
import { CoapMethod, OptionName } from 'coap-packet';
import { COAP_CLIENT_OPTS } from './options';
import { CoapMessages } from '../status';
import { $coapurl, ignores, transHead, transforms } from '../trans';

@Injectable()
export class CoapRequestAdapter extends StreamRequestAdapter<TransportRequest, TransportEvent, string> {

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Optional() readonly redirector: Redirector<string>,
        @Optional() readonly encoder: Encoder,
        @Optional() readonly decoder: Decoder) {
        super()
    }


    protected createRequest(url: string, req: TransportRequest<any>): IEndable {

        const opts = req.context.get(COAP_CLIENT_OPTS);
        const uri = new URL($coapurl.test(url) ? url : `coap://${opts.transportOpts?.hostname ?? 'localhost'}${opts.transportOpts?.port ? `:${opts.transportOpts?.port}` : ''}/${url}`);

        let host = uri.hostname;
        if (host.startsWith('[') && host.endsWith(']')) {
            host = host.substring(1, host.length - 1);
        }

        const options = {
            observe: req.headers.get('observe') === 'true',
            confirmable: true,
            accept: ctype.APPL_JSON,
            ...opts.transportOpts,
            host,
            pathname: uri.pathname,
            query: uri.search?.substring(1),
            method: this.tpCoapMethod(req.method)
            // host?: string;
            // hostname?: string;
            // port?: number;
            // method?: CoapMethod;
            // confirmable?: boolean;
            // observe?: 0 | 1 | boolean | string;
            // pathname?: string;
            // query?: string;
            // options?: Partial<Record<OptionName, OptionValue>>;
            // headers?: Partial<Record<OptionName, OptionValue>>;
            // agent?: Agent | false;
            // proxyUri?: string;
            // multicast?: boolean;
            // multicastTimeout?: number;
            // retrySend?: number;
            // token?: Buffer;
            // contentFormat?: string | number;
            // accept?: string | number;
        };
        if (uri.port) {
            options.port = parseInt(uri.port);
        }

        const coapreq = request(options);

        req.headers.forEach((key, value) => {
            if (isNil(value)) return;
            const lower = key.toLowerCase();
            if (transforms[lower]) {
                coapreq.setOption(transforms[lower], transHead(value, key));
            } else if (!ignores[key]) {
                coapreq.setOption(key, transHead(value, key))
            }
        })

        return coapreq as any;

    }

    protected override getResponseEvenName(): string {
        return ev.RESPONSE;
    }

    protected tpCoapMethod(method?: string): CoapMethod {
        if (!method) return 'GET';
        const meth = method.toUpperCase();
        switch (meth) {
            case 'IPATCH':
                return 'iPATCH';
            default:
                return meth as CoapMethod;
        }
    }

    protected parseStatusPacket(incoming: Incoming & { code: string, options: any }): StatusPacket<string> {
        const headers: Record<string, IncomingHeader> = {};
        Object.keys(incoming.headers).forEach(n => {
            const value = incoming.headers[n as OptionName];
            headers[n] = isArray(value) ? value.map(v => v.toString()) : (isBuffer(value) ? value.toString() : value ?? undefined);
        });
        return {
            status: incoming.code,
            statusText: headers[hdr.STATUS_MESSAGE] as string ?? CoapMessages[incoming.code] ?? '',
            headers,
            body: null,
            payload: incoming.payload?.length ? incoming.payload : null
        }
    }

    protected write(request: IEndable, req: TransportRequest, callback: (error?: Error | null) => void): void {
        const data = this.getPayload(req);
        if (data === null) {
            request.end(callback);
        } else {
            this.streamAdapter.sendbody(
                data,
                request,
                callback,
                req.headers.get(hdr.CONTENT_ENCODING) as string);
        }
    }

}
