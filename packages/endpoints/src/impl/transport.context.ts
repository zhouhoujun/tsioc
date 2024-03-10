import { EMPTY_OBJ, Injectable, Injector, isNil, isNumber, isString } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { HeaderRecord, LOCALHOST, TransportRequest } from '@tsdi/common';
import { MessageExecption, PacketLengthException, ResponsePacket, StreamAdapter, TransportSession, hdr, } from '@tsdi/common/transport';
import { RequestContext, TransportContextFactory } from '../RequestContext';
import { ServerOpts } from '../Server';
import { lastValueFrom } from 'rxjs';



export class TransportContextIml<TRequest extends TransportRequest = TransportRequest, TResponse extends ResponsePacket = ResponsePacket, TSocket = any> extends RequestContext<TRequest, TResponse, TSocket> {


    private _url: string;
    private _originalUrl: string;
    private _method: string;
    private _URL?: URL;

    readonly streamAdapter: StreamAdapter;

    constructor(
        injector: Injector,
        readonly session: TransportSession,
        readonly request: TRequest,
        readonly response: TResponse,
        private serverOptions: ServerOpts = EMPTY_OBJ
    ) {
        super(injector, { ...serverOptions, args: request });

        this.setValue(TransportSession, session);
        this.streamAdapter = session.streamAdapter;
        if (!response.id) {
            response.id = request.headers.get(hdr.IDENTITY);
        }
        if (isString(request.pattern)) {
            response.url = request.pattern;
        } else if (isNumber(request.pattern)) {
            response.type = request.pattern;
        } else {
            if (request.pattern.topic) {
                response.topic = request.pattern.topic;
                if (request.pattern.replyTo) {
                    response.replyTo = request.replyTo;
                }
            }

        }

        this._method = request.method ?? '';

        this._url = request.url ?? request.topic ?? '';
        this._originalUrl = request.headers?.['origin-path'] ?? this._url;
        const searhIdx = this._url.indexOf('?');
        if (searhIdx >= 0) {
            (this.request as any)['query'] = this.query;
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

    get originalUrl(): string {
        return this._originalUrl;
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

    protected parseURL(req: TransportRequest): URL {
        const url = req.url ?? req.topic ?? '';
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

    setHeader(headers: HeaderRecord): void {
        if (this.response.headers) {
            Object.assign(this.response.headers, headers)
        } else {
            this.response.headers = headers
        }
    }

    setResponse(packet: ResponsePacket): void {
        const { headers, payload, ...pkg } = packet;
        Object.assign(this.response, pkg);
        if (headers) this.setHeader(headers);
        this.body = payload;
    }

    get body(): any {
        return this.response.payload;
    }

    set body(value: any) {
        if (!this.streamAdapter.isStream(value)) {
            this._len = undefined;
        }
        this.response.payload = value;
    }

    private _len?: number;
    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        this._len = n;
    }

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    get length(): number | undefined {
        if (isNil(this._len)) {
            if (isNil(this.body)) {
                this._len = 0;
            } else if (this.streamAdapter.isStream(this.body)) {
                this._len = undefined;
            } else if (isString(this.body)) {
                this._len = Buffer.byteLength(this.body);
            } else if (isBuffer(this.body)) {
                this._len = this.body.length;
            } else {
                this._len = Buffer.byteLength(JSON.stringify(this.body))
            }
        }
        return this._len;
    }

    /**
     * The request method.
     */
    get method(): string {
        return this._method;
    }

    async respond(): Promise<any> {
        const res = this.response;
        if (isNil(this.response)) return;

        const session = this.session;

        const len = this.length ?? 0;
        if (session.options.maxSize && len > session.options.maxSize) {
            const btpipe = this.get<PipeTransform>('bytes-format');
            throw new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(session.options.maxSize)}`);
        }

        if (this.streamAdapter.isReadable(res)) {
            this.body = new TextDecoder().decode(await toBuffer(res));
        } else if (isBuffer(res)) {
            this.body = new TextDecoder().decode(res);
        }

        await lastValueFrom(session.send(this.response));
    }

    throwExecption(execption: MessageExecption): Promise<void> {
        this.execption = execption;
        this.body = null;
        this.response.error = {
            name: execption.name,
            message: execption.message,
            status: execption.status ?? execption.statusCode
        };
        if (!isNil(execption.status)) this.response.status = execption.status;
        this.response.statusText = execption.message;
        return lastValueFrom(this.session.send(this.response));
    }

}

const abstl = /^\w+:\/\//i;


@Injectable()
export class TransportContextFactoryImpl implements TransportContextFactory {
    create<TSocket, TInput extends TransportRequest<any>, TOutput extends ResponsePacket<any>>(injector: Injector, session: TransportSession, request: TInput, response: TOutput, options?: ServerOpts<any> | undefined): RequestContext<TInput, TOutput, TSocket> {
        return new TransportContextIml(injector, session, request, response, options);
    }

}