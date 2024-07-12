import { Injectable, InvocationContext, isNil, promisify } from '@tsdi/ioc';
import { Message, MessageFactory, UrlMesage } from '@tsdi/common';
import { AbstractTransportSession, MessageReader, MessageWriter, ctype, ev } from '@tsdi/common/transport';
import { HttpRequest } from '@tsdi/common/http';
import { ClientTransportSession } from '@tsdi/common/client';
import { request as httpRequest, IncomingMessage, ClientRequest } from 'http';
import { request as httpsRequest } from 'https';
import { ClientHttp2Session, ClientHttp2Stream, constants, OutgoingHttpHeaders, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, fromEvent } from 'rxjs';
import { HttpClientOpts } from './options';



export class HttpClientMessage implements Message {
    id: string | number | undefined;
    get headers(): (IncomingHttpHeaders & IncomingHttpStatusHeader) | IncomingHttpHeaders {
        return this.init.headers
    }
    public data: ClientHttp2Stream | IncomingMessage;
    constructor(private init: IncomingMessage | {
        headers: IncomingHttpHeaders & IncomingHttpStatusHeader,
        data: ClientHttp2Stream
    }) {
        this.data = init instanceof IncomingMessage ? init : init.data;
    }
}


export class Http2IncomingMessage {
    constructor(
        readonly headers: IncomingHttpHeaders & IncomingHttpStatusHeader,
        readonly stream: ClientHttp2Stream
    ) { }
}

export class HttpClientMessageFactory implements MessageFactory {
    create(initOpts: IncomingMessage | { id?: string | number; headers: IncomingHttpHeaders & IncomingHttpStatusHeader; data: ClientHttp2Stream; }): HttpClientMessage {
        return new HttpClientMessage(initOpts);
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
export class HttpClientMessageReader implements MessageReader {

    read(socket: ClientHttp2Session | null, channel: ClientHttp2Stream | ClientRequest, messageFactory: MessageFactory, session: AbstractTransportSession): Observable<Message> {
        if (channel instanceof ClientRequest) {
            return new Observable<Message>(subscribe => {
                const onResponse = (resp: IncomingMessage) => subscribe.next(messageFactory.create(resp));
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
            return fromEvent(channel, ev.RESPONSE, (headers) => messageFactory.create({ headers, data: channel }));
        }
    }
}

@Injectable()
export class HttpClientMessageWriter implements MessageWriter<ClientHttp2Session | null, UrlMesage, HttpRequest<any>, ClientTransportSession> {

    async write(socket: ClientHttp2Session | null, msg: UrlMesage, req: HttpRequest<any>, session: ClientTransportSession): Promise<any> {
        let url = msg.url;
        const clientOpts = session.clientOptions as HttpClientOpts;
        const ac = this.getAbortSignal(req.context);
        let stream: ClientHttp2Stream | ClientRequest;
        if (clientOpts.authority && socket && (!httptl.test(url) || url.startsWith(clientOpts.authority))) {
            url = url.replace(clientOpts.authority, '');

            const reqHeaders = (msg.headers ?? {}) as OutgoingHttpHeaders;

            if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = url;

            stream = socket.request(reqHeaders, { abort: ac?.signal, ...clientOpts.requestOptions } as ClientSessionRequestOptions);

        } else {
            const headers = req.headers ?? {};


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


