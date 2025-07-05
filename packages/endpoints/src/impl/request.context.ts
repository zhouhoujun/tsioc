import { Injector } from '@tsdi/ioc';
import { HeaderMappings, joinPath, LOCALHOST, normalize, parseQueryString } from '@tsdi/common';
import { Incoming, MessageException, Outgoing, TopicIncoming, UrlIncoming } from '@tsdi/common/transport';
import { lastValueFrom } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { ServiceConfig } from '../server.options';
import { ServerTransport } from '../transport';



export class UrlRequestContext<TRequest extends UrlIncoming<any> = UrlIncoming<any>, TResponse extends Outgoing<any> = Outgoing<any>, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {


    private _URL?: URL;
    private _url: string;
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
        readonly transport: ServerTransport,
        readonly request: TRequest,
        readonly response: TResponse,
        readonly serverOptions: ServiceConfig = {}
    ) {
        super(injector, serverOptions);

        this.setValue(ServerTransport, transport);
        this.originalUrl = request.pattern ? normalize(request.pattern) : this.request.url;
        this._url = !this.URL.pathname || this.URL.pathname === '/' ? this.request.url : this.URL.pathname;
        // const url = normalize(this.request.url!);

        const searhIdx = this.originalUrl.indexOf('?');
        if (searhIdx >= 0) {
            this.request.query = this.query;
        }
    }

    /**
    * Get request rul
    */
    get url(): string {
        return this._url;
    }

    /**
     * Set request url
     */
    set url(value: string) {
        this._url = value;
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

    protected parseURL(req: UrlIncoming<any>): URL {
        const url = req.url ?? '';
        if (abstl.test(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.serverOptions.listenOpts ?? {};
            const protocol = this.serverOptions.protocol;
            let baseUrl: URL;
            try {
                baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}:${port ?? 3000}`, path);
            } catch (err) {
                baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}:${port ?? 3000}`);
            }
            if (url.indexOf(':') > 0) {
                return baseUrl;
            }
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }


    async throwException(execption: MessageException): Promise<void> {
        if (this.headersSent) return;
        this.execption = execption;

        await lastValueFrom(this.transport.send(this));
    }

}

const abstl = /^\w+:\/\//i;


export class PatternRequestContext<TRequest extends Incoming<any> = Incoming<any>, TResponse extends Outgoing<any> = Outgoing<any>, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {

    readonly originalUrl: string;

    url: string;

    constructor(
        injector: Injector,
        readonly transport: ServerTransport,
        readonly request: TRequest,
        readonly response: TResponse,
        readonly serverOptions: ServiceConfig = {}
    ) {
        super(injector, serverOptions);

        this.setValue(ServerTransport, transport);

        this.originalUrl = this.url = normalize(request.pattern!);
        const searhIdx = this.url.indexOf('?');
        if (!this.request.query || searhIdx > 0) {
            this.request.query = this.query;
        }
    }

    private _query: Record<string, any> | undefined;
    get query(): Record<string, any> {
        if (!this._query) {
            const url = this.url;
            const idx = url.indexOf('?');
            if (idx > 0) {
                const urlParams = parseQueryString(url.slice(idx + 1));

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

    async throwException(execption: MessageException): Promise<void> {
        if (this.headersSent) return;
        this.execption = execption;

        await lastValueFrom(this.transport.send(this));
    }
}

export class TopicRequestContext<TRequest extends TopicIncoming<any> = TopicIncoming<any>, TResponse extends Outgoing<any> = Outgoing<any>, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {

    readonly originalUrl: string;

    url: string;

    readonly topic: string;
    readonly responseTopic: string | undefined;

    constructor(
        injector: Injector,
        readonly transport: ServerTransport,
        readonly request: TRequest,
        readonly response: TResponse,
        readonly serverOptions: ServiceConfig = {}
    ) {
        super(injector, serverOptions);

        this.setValue(ServerTransport, transport);

        this.url = this.topic = normalize(request.topic);
        this.originalUrl = request.pattern ? normalize(request.pattern) : this.url;
        this.responseTopic = request.responseTopic ?? transport.options.getResponseTopic?.(request.topic);
        const searhIdx = this.url.indexOf('?');
        if (!this.request.query || searhIdx > 0) {
            this.request.query = this.query;
        }
    }

    private _query: Record<string, any> | undefined;
    get query(): Record<string, any> {
        if (!this._query) {
            const url = this.url;
            const idx = url.indexOf('?');
            if (idx > 0) {
                const urlParams = parseQueryString(url.slice(idx + 1));

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

    async throwException(execption: MessageException): Promise<void> {
        if (this.headersSent) return;
        this.execption = execption;

        await lastValueFrom(this.transport.send(this));
    }
}

