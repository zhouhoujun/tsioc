import { EMPTY_OBJ, Injectable, Injector, isNil } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { LOCALHOST, normalize } from '@tsdi/common';
import {
    FileAdapter, Incoming, MessageExecption, MimeAdapter, Outgoing, PacketLengthException,
    ResponsePacket, StatusAdapter, StreamAdapter, isBuffer, toBuffer,
} from '@tsdi/common/transport';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { ServerOpts } from '../Server';
import { lastValueFrom } from 'rxjs';
import { TransportSession } from '../transport.session';
import { AcceptsPriority } from '../accepts';



export class RequestContextImpl<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {


    private _URL?: URL;
    readonly originalUrl: string;

    constructor(
        injector: Injector,
        readonly session: TransportSession,
        readonly request: TRequest,
        readonly response: TResponse,
        readonly statusAdapter: StatusAdapter | null,
        readonly mimeAdapter: MimeAdapter | null,
        readonly acceptsPriority: AcceptsPriority | null,
        readonly streamAdapter: StreamAdapter,
        readonly fileAdapter: FileAdapter,
        readonly serverOptions: ServerOpts = EMPTY_OBJ
    ) {
        super(injector, { ...serverOptions, args: request });

        this.setValue(TransportSession, session);
        if (!response.id) {
            response.id = request.id
        }

        this.originalUrl = this.url = normalize(this.url);
        const searhIdx = this.url.indexOf('?');
        if (searhIdx >= 0) {
            (this.request as any)['query'] = this.query;
        }
    }


    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const qs = this._query = {} as Record<string, any>;
            this.URL?.searchParams?.forEach((v, k) => {
                qs[k] = v;
            });
        }
        return this._query;
    }

    /**
    * Get WHATWG parsed URL.
    * Lazily memoized.
    *
    * @return {URL|Object}
    * @api public
    */
    get URL(): URL {
        /* istanbul ignore else */
        if (!this._URL) {
            this._URL = this.createURL();
        }
        return this._URL!;
    }

    protected createURL() {
        try {
            return this.parseURL(this.request);
        } catch (err) {
            return Object.create(null);
        }
    }

    protected parseURL(req: Incoming): URL {
        const url = req.url ?? '';
        if (abstl.test(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.serverOptions.listenOpts ?? EMPTY_OBJ;
            const protocol = this.serverOptions.protocol;
            const baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }


    setResponse(packet: ResponsePacket): void {
        const { headers, payload, ...pkg } = packet;
        Object.assign(this.response, pkg);
        if (headers) this.setHeader(headers);
        this.body = payload;
    }

    async respond(): Promise<any> {
        if (this.sent) return;
        await lastValueFrom(this.session.send(this));
    }

    async throwExecption(execption: MessageExecption): Promise<void> {
        if (this.sent) return;
        this.execption = execption;
        this.body = null;
        this.response.error = {
            name: execption.name,
            message: execption.message,
            status: execption.status ?? execption.statusCode
        };
        if (!isNil(execption.status)) this.response.statusCode = execption.status;
        this.response.statusMessage = execption.message;
        return await lastValueFrom(this.session.send(this));
    }

}

const abstl = /^\w+:\/\//i;


@Injectable()
export class RequestContextFactoryImpl implements RequestContextFactory<Incoming, Outgoing> {
    create<TSocket = any>(session: TransportSession, request: Incoming, response: Outgoing, options?: ServerOpts<any> | undefined): RequestContext<Incoming, Outgoing, TSocket> {
        const injector = session.injector;
        return new RequestContextImpl(injector,
            session,
            request,
            response,
            injector.get(StatusAdapter, null),
            injector.get(MimeAdapter, null),
            injector.get(AcceptsPriority, null),
            injector.get(StreamAdapter),
            injector.get(FileAdapter),
            options);
    }

}