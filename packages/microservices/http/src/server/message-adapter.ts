import { Injectable, isNil, isString, ArgumentException, Inject } from '@tsdi/ioc';
import { AcceptsPriority, Header, HeaderAccess, RestfulRequestAdapter, MimeAdapter, StreamAdapter, ContentType, BadRequestException, ForbiddenException, NotFoundException, RequestContext } from '@tsdi/common';
import { HttpCookieStore, HttpRequestMessage, HttpServResponse } from './http-context';

@Injectable()
export class HttpMessageAdapter<TBody = any> extends RestfulRequestAdapter<HttpRequestMessage<TBody>, HttpServResponse, any> {
    private responseHeaders = new Map<string, Header>();
    private responseBody: any;
    private responseStatus: any;
    private responseStatusMessage?: string;
    private responseError: any;
    protected context?: RequestContext;

    constructor(
        private _request: HttpRequestMessage<TBody>,
        private _response?: HttpServResponse,
        private acceptsPriority?: AcceptsPriority,
        private mimeAdapter?: MimeAdapter,
        context?: RequestContext,
        @Inject(StreamAdapter) private streamAdapter?: StreamAdapter,
    ) {
        super();
        this.context = context;
    }

    get request(): HttpRequestMessage<TBody> {
        return this._request;
    }

    get response(): HttpServResponse {
        return this._response!;
    }

    get status(): any {
        return this.getStatus();
    }

    set status(value: any) {
        this.setStatus(value);
    }

    get isHandled(): boolean {
        return !isNil(this.getStatus()) || !isNil(this.getBody()) || !isNil(this.getError());
    }

    get isCommitted(): boolean {
        return this.isHeadersSent();
    }

    get query(): Record<string, any> {
        return this._request?.query ?? {};
    }

    get cookies(): HttpCookieStore {
        return (this._request?.cookies ?? {
            get: () => undefined,
            set: () => undefined,
        }) as HttpCookieStore;
    }

    get secure(): boolean {
        return !!(this._request?.socket as any)?.encrypted;
    }

    get session(): Record<string, any> | undefined {
        return this._request?._session as Record<string, any> | undefined;
    }

    get body(): any {
        return this._request?.body;
    }

    set body(value: any) {
        if (this._request) {
            this._request.body = value;
        }
    }

    get hostname(): string {
        return this._request?.headers?.host ? String(this._request.headers.host).split(':', 1)[0] : '';
    }

    get method(): string {
        return this._request?.method ?? '';
    }

    get path(): string {
        return this._request?.url?.split('?', 1)[0] ?? '';
    }

    get originalUrl(): string {
        return this._request?.rawUrl ?? this._request?.url ?? '';
    }

    async handle(): Promise<void> {
        return;
    }

    commit(): void {
        return;
    }

    async destroy(): Promise<void> {
        return;
    }

    redirect(url: string, status = 302): void {
        this.setHeader('location', url);
        this.setStatus(status);
    }

    async render(_template: string, _data?: Record<string, any>): Promise<void> {
        return;
    }

    json(data: any): void {
        this.write(data);
    }

    send(data: any): void {
        this.write(data);
    }

    html(data: string): void {
        this.write(data);
    }

    text(data: string): void {
        this.write(data);
    }

    read(section: any, name?: string): any {
        switch (section) {
            case 'headers':
                return name ? this.header(name) : this.headers();
            case 'payload':
                return name ? this.payload(name) : this.payload();
            case 'body':
                return name ? this.bodyValue(name) : this.bodyValue();
            case 'params':
                return name ? this.param(name) : this.params();
            case 'query':
                return name ? this.queryValue(name) : this.query;
            case 'path':
                return name ? this.pathValue(name) : this.pathValue();
            case 'topic':
                return this.topic();
            case 'cookie':
                return name ? this.cookies.get(name) : this.cookies;
            case 'session':
                return name ? (this.session as any)?.data?.[name] ?? (this.session as any)?.[name] : this.session;
            case 'status':
                return this.getStatus();
            case 'statusMessage':
                return this.getStatusMessage();
            case 'error':
                return this.getError();
            default:
                return undefined;
        }
    }

    getHeaders(): Record<string, any> {
        return this.headers();
    }

    getHeader(name: string): any {
        return this.header(name);
    }

    getResponseHeaderNames(): string[] {
        return Array.from(this.responseHeaders.keys());
    }

    getResponseHeader(name: string): Header {
        return this.responseHeaders.get(name.toLowerCase());
    }

    accepts(...args: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept') ?? '*';
        if (!args.length) {
            return accepts ?? false;
        }
        const mimeAdapter = this.mimeAdapter;
        const medias = args.map(a => a.indexOf('/') === -1 ? mimeAdapter?.lookup(a) ?? a : a).filter(a => isString(a)) as string[];
        return acceptsPriority.priority(accepts, medias, 'media')[0] ?? false;
    }

    acceptsEncodings(...encodings: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept-encoding') ?? '*';
        if (!encodings.length) {
            return accepts;
        }
        return acceptsPriority.priority(accepts, encodings, 'encodings')[0] ?? false;
    }

    acceptsCharsets(...charsets: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept-charset') ?? '*';
        if (!charsets.length) {
            return accepts;
        }
        return acceptsPriority.priority(accepts, charsets, 'charsets')[0] ?? false;
    }

    acceptsLanguages(...langs: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept-language') ?? '*';
        if (!langs.length) {
            return accepts;
        }
        return acceptsPriority.priority(accepts, langs, 'lang')[0] ?? false;
    }

    write(body: any): void {
        this.responseBody = body;
    }

    setHeader(name: string, value: Header): void {
        const key = name.toLowerCase();
        this.responseHeaders.set(key, value);
    }

    removeHeader(name: string): void {
        this.responseHeaders.delete(name.toLowerCase());
    }

    setStatus(code: any, message?: string): void {
        this.responseStatus = code;
        if (!isNil(message)) {
            this.responseStatusMessage = message;
        }
    }

    writeError(error: any): void {
        this.responseError = error;
    }

    getStatus(): any { return this.responseStatus; }
    getStatusMessage(): any { return this.responseStatusMessage; }
    getError(): any { return this.responseError; }
    getBody(): any { return this.responseBody; }
    hasHeader(name: string): boolean { return this.responseHeaders.has(name.toLowerCase()); }
    isHeadersSent(): boolean { return this._response?.headersSent ?? false; }

    /**
     * Write headers from adapter state to the raw HTTP response.
     * Called before sendResponse / sendError to ensure headers are set.
     */
    sendHeaders(headers?: Record<string, Header>): void {
        const res = this._response;
        if (!res) return;

        const hdrs = headers ?? this.getResponseHeaderNames().reduce((acc, name) => {
            const v = this.getResponseHeader(name);
            if (!isNil(v)) acc[name] = v;
            return acc;
        }, {} as Record<string, Header>);

        for (const [name, value] of Object.entries(hdrs)) {
            if (!isNil(value)) res.setHeader(name, value as any);
        }

        const ct = this.getResponseHeader('content-type') ?? this.context?.getContentType();
        if (ct && !res.hasHeader('content-type')) {
            res.setHeader('content-type', ct as any);
        }

        res.statusCode = this.getStatus() ?? 200;
        const msg = this.getStatusMessage();
        if (msg) try { res.statusMessage = msg; } catch { /* http2 */ }
    }

    /**
     * Write adapter state to the HTTP response.
     */
    sendResponse(response?: any): void {
        const res = this._response;
        if (!res) return;

        this.sendHeaders();
        const payload = !isNil(this.getBody()) ? this.getBody() : response === this ? undefined : response;

        if (isNil(payload)) {
            res.end();
            return;
        }

        if (this._request?.method?.toUpperCase() === 'HEAD') {
            res.end();
            return;
        }

        const streamAdapter = this.streamAdapter ?? this.context?.get(StreamAdapter);
        if (streamAdapter?.isStream(payload)) {
            streamAdapter.pipeTo(payload, res as any, { end: true }).catch(() => {});
            return;
        }

        if (!res.hasHeader('content-type') && typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
            res.setHeader('content-type', ContentType.APPL_JSON_UTF8);
        }
        res.end(typeof payload === 'string' || Buffer.isBuffer(payload) ? payload : JSON.stringify(payload));
    }

    /**
     * Map an exception to an HTTP error response.
     */
    sendError(err: any): void {
        const res = this._response;
        if (!res) return;

        const status = err?.statusCode ?? err?.status
            ?? (err instanceof BadRequestException || err instanceof ArgumentException || err?.constructor?.name === 'MissingParameterException'
                ? 400
                : err instanceof ForbiddenException
                    ? 403
                    : err instanceof NotFoundException
                        ? 404
                        : 500);
        const expose = typeof err?.expose === 'boolean' ? err.expose : (status >= 400 && status < 500);

        const body = status >= 500 && !expose
            ? { statusCode: status, statusMessage: 'Internal Server Error', message: 'Internal Server Error' }
            : {
                statusCode: status,
                statusMessage: err?.statusMessage || err?.message || 'Error',
                message: err?.message || err?.statusMessage || 'Error',
                ...(err?.details ? { details: err.details } : {})
            };

        this.setStatus(status, err?.statusMessage);
        this.writeError(err);
        this.write(body);

        if (err?.headers && typeof err.headers === 'object') {
            Object.entries(err.headers).forEach(([name, value]) => {
                if (!isNil(value) && !this.hasHeader(name)) {
                    this.setHeader(name, value as any);
                }
            });
        }

        this.sendHeaders(err?.headers);

        if (this._request?.method?.toUpperCase() === 'HEAD') {
            res.end();
            return;
        }
        res.end(JSON.stringify(body));
    }

    protected headers(): Record<string, any> {
        return this._request?.headers ?? {};
    }

    protected header(name: string): any {
        const request = this._request;
        if (!request) {
            return undefined;
        }
        return request.getHeader(name) ?? (request.headers as HeaderAccess | undefined)?.getHeader?.(name);
    }

    protected payload(field?: string): any {
        const body = this._request?.body;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    protected bodyValue(field?: string): any {
        const body = this._request?.body;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    protected params(): Record<string, any> | undefined {
        return this._request?.params;
    }

    protected param(name: string): any {
        return this._request?.params?.[name];
    }

    protected queryValue(name?: string): any {
        const query = this._request?.query;
        if (name === undefined) {
            return query;
        }
        return query?.[name];
    }

    protected pathValue(name?: string): any {
        const path = this._request?.paths;
        if (name === undefined) {
            return path;
        }
        return path?.[name];
    }

    protected topic(): string | undefined {
        return undefined;
    }
}
