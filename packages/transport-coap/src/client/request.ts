import { Injectable, Optional, isArray } from '@tsdi/ioc';
import { Decoder, Encoder, IEndable, IncomingHeader, Redirector, StatusVaildator, StreamAdapter, TransportEvent, TransportRequest, Incoming } from '@tsdi/core';
import { MimeAdapter, MimeTypes, StatusPacket, hdr, StreamRequestAdapter, ev, isBuffer } from '@tsdi/transport';
import { request, OptionValue, Agent } from 'coap';
import { CoapMethod, OptionName } from 'coap-packet';
import { COAP_CLIENT_OPTS } from './options';

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
        const uri = new URL(coaptl.test(url) ? url : `coap://${opts.transportOpts?.hostname ?? 'localhost'}:${opts.transportOpts?.port ?? 5683}/${url}`);
        const options = req.headers.headers as Partial<Record<OptionName, OptionValue>>;

        const requestStream = request({
            ...opts.transportOpts,
            hostname: uri.hostname,
            port: parseInt(uri.port),
            pathname: uri.pathname,
            query: uri.search,
            method: this.tpCoapMethod(req.method),
            options,
            headers: options,
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
        return requestStream as any;

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

    protected parseStatusPacket(incoming: Incoming): StatusPacket<string> {
        const headers: Record<string, IncomingHeader> = {};
        Object.keys(incoming.headers).forEach(n => {
            const value = incoming.headers[n as OptionName];
            headers[n] = isArray(value) ? value.map(v => v.toString()) : (isBuffer(value) ? value.toString() : value ?? undefined);
        });
        return {
            status: headers[hdr.STATUS] as string,
            statusText: String(headers[hdr.STATUS_MESSAGE]),
            headers,
            body: incoming.body,
            payload: incoming.payload
        }
    }

}

const coaptl = /^coap(s)?:\/\//i;