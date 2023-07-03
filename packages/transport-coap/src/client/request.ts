import { Injectable, Optional, isArray, isNil, isNumber } from '@tsdi/ioc';
import { Decoder, Encoder, IEndable, IncomingHeader, Redirector, StatusVaildator, StreamAdapter, TransportEvent, TransportRequest, Incoming } from '@tsdi/core';
import { MimeAdapter, MimeTypes, StatusPacket, hdr, StreamRequestAdapter, ev, isBuffer, ctype } from '@tsdi/transport';
import { request } from 'coap';
import { CoapMethod, OptionName } from 'coap-packet';
import { COAP_CLIENT_OPTS } from './options';
import { CoapMessages } from '../status';

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
        const uri = new URL(coaptl.test(url) ? url : `coap://${opts.transportOpts?.hostname ?? 'localhost'}${opts.transportOpts?.port ? `:${opts.transportOpts?.port}` : ''}/${url}`);

        let hostname = uri.hostname;
        if (hostname.startsWith('[') && hostname.endsWith(']')) {
            hostname = hostname.substring(1, hostname.length - 1);
        }
        const coapreq = request({
            ...opts.transportOpts,
            observe: true,
            // confirmable: true,
            hostname,
            query: uri.search?.substring(1),
            port: uri.port ? parseInt(uri.port) : undefined,
            pathname: uri.pathname,
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
        });

        // coapreq.setOption('Accept', ctype.REQUEST_ACCEPT);

        req.headers.forEach((key, value) => {
            if (isNil(value)) return;
            if (transforms[key]) {
                coapreq.setOption(transforms[key], this.generHead(value));
            } else if (ignores.indexOf(key) < 0) {
                coapreq.setOption(key, this.generHead(value))
            }
        })

        return coapreq as any;

    }

    protected generHead(head: string | number | readonly string[] | undefined): Buffer | string | number | Buffer[] {
        if (isArray(head)) return head.map(v => Buffer.from(v))
        if (isBuffer(head) || isNumber(head)) return head;
        return Buffer.from(`${head}`);
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

    protected parseStatusPacket(incoming: Incoming & { code: string }): StatusPacket<string> {
        const headers: Record<string, IncomingHeader> = {};
        Object.keys(incoming.headers).forEach(n => {
            const value = incoming.headers[n as OptionName];
            headers[n] = isArray(value) ? value.map(v => v.toString()) : (isBuffer(value) ? value.toString() : value ?? undefined);
        });
        return {
            status: incoming.code,
            statusText: headers[hdr.STATUS_MESSAGE] as string ?? CoapMessages[incoming.code] ?? '',
            headers,
            body: incoming.body,
            payload: incoming.payload
        }
    }

    protected write(request: IEndable, req: TransportRequest, callback: (error?: Error | null) => void): void {
        const data = this.getPayload(req);
        if (data === null) {
            request.end();
            callback();
        } else {
            this.streamAdapter.sendbody(
                this.encoder ? this.encoder.encode(data) : data,
                request,
                (err?) => {
                    request.end();
                    callback(err);
                },
                req.headers.get(hdr.CONTENT_ENCODING) as string);
        }
    }

}

const transforms: Record<string, OptionName> = {
};

const ignores = [
    hdr.LAST_MODIFIED,
    hdr.CACHE_CONTROL
]


const coaptl = /^coap(s)?:\/\//i;