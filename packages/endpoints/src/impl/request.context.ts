import { EMPTY_OBJ, Injectable, Injector, isNil } from '@tsdi/ioc';
import { HeaderMappings, LOCALHOST, normalize, Response } from '@tsdi/common';
import { Incoming, MessageExecption, Outgoing } from '@tsdi/common/transport';
import { lastValueFrom } from 'rxjs';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { ServerOpts } from '../Server';
import { TransportSession } from '../transport.session';



export class UrlRequestContext<TRequest extends Incoming<any> = Incoming<any>, TResponse extends Outgoing<any> = Outgoing<any>, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {


    private _URL?: URL;
    readonly originalUrl: string;
    /**
     * request header mappings
     */
    readonly reqHeaders!: HeaderMappings;
    /**
     * request header mappings
     */
    readonly resHeaders!: HeaderMappings;

    constructor(
        injector: Injector,
        readonly session: TransportSession,
        readonly request: TRequest,
        readonly response: TResponse,
        readonly serverOptions: ServerOpts = EMPTY_OBJ
    ) {
        super(injector, { ...serverOptions, args: request });

        this.setValue(TransportSession, session);
        
        this.originalUrl = this.url = normalize(this.url);
        const searhIdx = this.url.indexOf('?');
        if (searhIdx >= 0) {
            this.request.query = this.query;
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


    get query(): Record<string, any> {
        if (!this.request.query) {
            const qs = this.request.query = {} as Record<string, any>;
            this.URL.searchParams?.forEach((v, k) => {
                qs[k] = v;
            });
        }
        return this.request.query;
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

    protected parseURL(req: Incoming<any>): URL {
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


    setResponse(packet: Response<any>): void {
        const { headers, payload, ...pkg } = packet;
        Object.assign(this.response, pkg);
        if (headers) this.setHeader(headers);
        this.body = payload;
    }

    async respond(): Promise<any> {
        if (this.sent) return;
        await lastValueFrom(this.session.send(this));
    }

    async respondExecption(execption: MessageExecption): Promise<void> {
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


export class PatternRequestContext<TRequest extends Incoming<any> = Incoming<any>, TResponse extends Outgoing<any> = Outgoing<any>, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {

    readonly originalUrl: string;

    url: string;

    constructor(
        injector: Injector,
        readonly session: TransportSession,
        readonly request: TRequest,
        readonly response: TResponse,
        readonly serverOptions: ServerOpts = EMPTY_OBJ
    ) {
        super(injector, { ...serverOptions, args: request });

        this.setValue(TransportSession, session);

        this.originalUrl = this.url = normalize(request.url ?? request.pattern!);
        const searhIdx = this.url.indexOf('?');
        if (!this.request.query || searhIdx > 0) {
            this.request.query = this.query;
        }
    }

    private _query: Record<string, any> | undefined;
    get query(): Record<string, any> {
        if (!this._query) {
            let urlParams: Record<string, any> = null!;
            const url = this.url;
            const idx = url.indexOf('?');
            if (idx > 0) {
                urlParams = {};
                const params = url.slice(idx + 1).split('&');
                params.forEach(p => {
                    const [key, value] = p.split('=');
                    if (value) {
                        urlParams[decodeURIComponent(key)] = decodeURIComponent(value);
                    }
                })

                if (this.request.query) {
                    this.request.query = { ...urlParams, ...this.request.query ?? {} }
                } else {
                    this.request.query = urlParams;
                }
            }
            if (!this.request.query) {
                this.request.query = {};
            }
            this._query = this.request.query;

        }
        return this._query;
    }


    setResponse(packet: Response<any>): void {
        const { headers, payload, ...pkg } = packet;
        Object.assign(this.response, pkg);
        if (headers) this.setHeader(headers);
        this.body = payload;
    }

    async respond(): Promise<any> {
        if (this.sent) return;
        await lastValueFrom(this.session.send(this));
    }

    async respondExecption(execption: MessageExecption): Promise<void> {
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
export class RequestContextFactoryImpl implements RequestContextFactory<Incoming<any>, Outgoing<any>> {
    create<TSocket = any>(session: TransportSession, request: Incoming<any>, response: Outgoing<any>, options?: ServerOpts<any> | undefined): RequestContext<Incoming<any>, Outgoing<any>, TSocket> {
        const injector = session.injector;
        if (request.url) {
            return new UrlRequestContext(injector,
                session,
                request,
                response,
                options);
        } else {
            return new PatternRequestContext(injector,
                session,
                request,
                response,
                options);
        }
    }

}