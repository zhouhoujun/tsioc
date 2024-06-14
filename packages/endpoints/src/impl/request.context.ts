import { EMPTY_OBJ, Injectable, Injector, isNil } from '@tsdi/ioc';
import { HeaderMappings, LOCALHOST, normalize, PatternFormatter, ResponsePacket } from '@tsdi/common';
import {  FileAdapter, Incoming, MessageExecption, MimeAdapter, Outgoing, StatusAdapter, StreamAdapter } from '@tsdi/common/transport';
import { lastValueFrom } from 'rxjs';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { ServerOpts } from '../Server';
import { TransportSession } from '../transport.session';
import { AcceptsPriority } from '../accepts';



export class UrlRequestContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {


    private _URL?: URL;
    readonly originalUrl: string;


    /**
     * request header mappings
     */
    readonly reqHeaders: HeaderMappings;
    /**
     * request header mappings
     */
    readonly resHeaders: HeaderMappings;

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
        this.reqHeaders = request.headers instanceof HeaderMappings ? request.headers : new HeaderMappings(request.headers);
        this.resHeaders = response.headers instanceof HeaderMappings ? response.headers : new HeaderMappings(response.headers);

        this.originalUrl = this.url = normalize(this.url);
        const searhIdx = this.url.indexOf('?');
        if (searhIdx >= 0) {
            (this.request as any)['query'] = this.query;
        }
    }

    /**
     * Get request rul
     */
    get url(): string {
        return this.request.url!
    }
    /**
     * Set request url
     */
    set url(value: string) {
        this.request.url = value;
    }


    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const qs = this._query = {} as Record<string, any>;
            this.URL.searchParams?.forEach((v, k) => {
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
            let baseUrl: URL;
            try {
                baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}:${port ?? 3000}`, path);
            } catch (err) {
                baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}:${port ?? 3000}`);
            }
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
        if (!isNil(execption.status)) this.status = execption.status;
        this.statusMessage = execption.message;
        await lastValueFrom(this.session.send(this));
    }

}

const abstl = /^\w+:\/\//i;


export class PatternRequestContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {



    readonly originalUrl: string;

    url: string;
    /**
     * request header mappings
     */
    readonly reqHeaders: HeaderMappings;
    /**
     * request header mappings
     */
    readonly resHeaders: HeaderMappings;

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
        this.reqHeaders = request.headers instanceof HeaderMappings ? request.headers : new HeaderMappings(request.headers);
        this.resHeaders = response.headers instanceof HeaderMappings ? response.headers : new HeaderMappings(response.headers);

        this.originalUrl = this.url = injector.get(PatternFormatter).format(request.pattern!);
    }

    get query(): Record<string, any> {
        return this.request.params ?? {}
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
        if (!isNil(execption.status)) this.status = execption.status;
        this.statusMessage = execption.message;
        await lastValueFrom(this.session.send(this));
    }
}



@Injectable()
export class RequestContextFactoryImpl implements RequestContextFactory<Incoming, Outgoing> {
    create<TSocket = any>(session: TransportSession, request: Incoming, response: Outgoing, options?: ServerOpts<any> | undefined): RequestContext<Incoming, Outgoing, TSocket> {
        const injector = session.injector;
        if (request.url) {
            return new UrlRequestContext(injector,
                session,
                request,
                response,
                injector.get(StatusAdapter, null),
                injector.get(MimeAdapter, null),
                injector.get(AcceptsPriority, null),
                injector.get(StreamAdapter),
                injector.get(FileAdapter),
                options);
        } else {
            return new PatternRequestContext(injector,
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

}