import { EMPTY_OBJ, Injectable, InvocationContext, isNil, promisify } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage, UrlMesage } from '@tsdi/common';
import { ClientIncoming, ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, MessageReader, MessageWriter, ctype, ev } from '@tsdi/common/transport';
import { HttpRequest } from '@tsdi/common/http';
import { ClientTransportSession } from '@tsdi/common/client';
import { request as httpRequest, IncomingMessage, ClientRequest } from 'http';
import { request as httpsRequest } from 'https';
import { ClientHttp2Session, ClientHttp2Stream, constants, OutgoingHttpHeaders, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, fromEvent } from 'rxjs';
import { HttpClientOpts } from './options';
import { HttpMesage } from '../message';





export class HttpClientIncoming<T> extends ClientIncomingPacket<T, number> {
    constructor(init: ClientIncomingOpts, defaultStatus = 0, defaultStatusText = 'OK') {
        super(init, defaultStatus, defaultStatusText)
    }

    clone(): HttpClientIncoming<T>;
    clone<V>(update: ClientIncomingCloneOpts<V, number>): HttpClientIncoming<V>;
    clone(update: ClientIncomingCloneOpts<T, number>): HttpClientIncoming<T>;
    clone(update: ClientIncomingCloneOpts<any, number> = {}): HttpClientIncoming<any> {
        const init = this.cloneOpts(update);
        return new HttpClientIncoming(init)
    }
}


export class HttpClientIncomingFactory implements ClientIncomingFactory {
    create(options: ClientIncomingOpts): HttpClientIncoming<any> {
        let opts: ClientIncomingOpts;
        if (options instanceof IncomingMessage) {
            // const incoming = options as ClientIncomingOpts;
            // options = options;
            // return incoming;
            const { method, url, headers, httpVersion, httpVersionMajor, httpVersionMinor, statusCode, statusMessage } = options;
            opts = { statusMessage, statusCode, headers, url, method, payload: options }
        } else {
            opts = options;
            const headers = opts.headers as IncomingHttpHeaders & IncomingHttpStatusHeader;
            opts.url = headers[':path'];
            opts.method = headers[':method'];
            const status = opts.status = headers[':status'] as HttpStatusCode;
            opts.statusMessage = statusMessage[status];
        }
        return new HttpClientIncoming(opts);
    }

}


const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = constants;

const httptl = /^https?:\/\//i;
const secureExp = /^https:/;

@Injectable()
export class HttpClientMessageReader implements MessageReader<ClientHttp2Session | null, ClientHttp2Stream | ClientRequest, ClientIncoming, ClientTransportSession> {

    read(socket: ClientHttp2Session | null, channel: ClientHttp2Stream | ClientRequest, session: ClientTransportSession): Observable<ClientIncoming> {
        if (channel instanceof ClientRequest) {
            return new Observable<ClientIncoming>(subscribe => {
                const onResponse = (resp: IncomingMessage) => subscribe.next(session.incomingFactory.create(resp));
                const onError = (err: any) => err && subscribe.error(err);
                channel.on(ev.CLOSE, onError);
                channel.on(ev.ERROR, onError);
                channel.on(ev.ABOUT, onError);
                channel.on(ev.TIMEOUT, onError);
                channel.on(ev.RESPONSE, onResponse);

                return () => {
                    channel.off(ev.CLOSE, onError);
                    channel.off(ev.ERROR, onError);
                    channel.off(ev.ABOUT, onError);
                    channel.off(ev.TIMEOUT, onError);
                    channel.off(ev.RESPONSE, onResponse);
                    subscribe.unsubscribe();
                }
            })
        } else {
            return fromEvent(channel, ev.RESPONSE, (headers) => session.incomingFactory.create({ headers, payload: channel }));
        }
    }
}

@Injectable()
export class HttpClientMessageWriter implements MessageWriter<ClientHttp2Session | null, any, HttpMesage, HttpRequest<any>, ClientTransportSession> {

    async write(socket: ClientHttp2Session | null, channel: null, msg: HttpMesage, req: HttpRequest<any>, session: ClientTransportSession): Promise<any> {
        let url = msg.url;
        const clientOpts = session.clientOptions as HttpClientOpts;
        const ac = this.getAbortSignal(req.context);
        let stream: ClientHttp2Stream | ClientRequest;
        if (clientOpts.authority && socket && (!httptl.test(url) || url.startsWith(clientOpts.authority))) {
            url = url.replace(clientOpts.authority, '');

            const reqHeaders = msg.headers as OutgoingHttpHeaders ?? EMPTY_OBJ;

            if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = url;

            stream = socket.request(reqHeaders, { abort: ac?.signal, ...clientOpts.requestOptions } as ClientSessionRequestOptions);

        } else {
            const headers = msg.headers ?? {};


            const option = {
                method: req.method,
                headers: {
                    'accept': ctype.REQUEST_ACCEPT,
                    ...headers,
                },
                abort: ac?.signal
            };

            stream = secureExp.test(url) ? httpsRequest(url, option) : httpRequest(url, option);

        }


        if (isNil(msg.data)) {
            await promisify(stream.end, stream)();
        } else {
            await session.streamAdapter.pipeTo(msg.data, stream);
        }
        return stream;

    }

    protected getAbortSignal(ctx?: InvocationContext): AbortController {
        return !ctx || typeof AbortController === 'undefined' ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }

}


