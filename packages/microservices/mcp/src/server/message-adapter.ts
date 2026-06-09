import { Injectable, isNil, isString, ArgumentException } from '@tsdi/ioc';
import { Header, RestfulRequestAdapter, ContentType, BadRequestException, ForbiddenException, NotFoundException } from '@tsdi/common';
import * as http from 'node:http';

@Injectable()
export class McpMessageAdapter extends RestfulRequestAdapter<Record<string, any>, http.ServerResponse, any> {
    private responseHeaders = new Map<string, Header>();
    private responseBody: any;
    private responseStatus: any;
    private responseStatusMessage?: string;
    private responseError: any;

    constructor(
        private requestData: Record<string, any>,
        private httpResponse: http.ServerResponse,
    ) {
        super();
    }

    get request(): Record<string, any> {
        return this.requestData;
    }

    get response(): http.ServerResponse {
        return this.httpResponse;
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
        return this.requestData?.query ?? {};
    }

    get cookies(): { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, any>): void } {
        return {
            get: () => undefined,
            set: () => undefined,
        };
    }

    get secure(): boolean {
        return false;
    }

    get session(): Record<string, any> | undefined {
        return undefined;
    }

    get body(): any {
        return this.requestData?.body;
    }

    set body(value: any) {
        if (this.requestData) {
            this.requestData.body = value;
        }
    }

    get hostname(): string {
        return '';
    }

    get method(): string {
        return this.requestData?.method ?? '';
    }

    get path(): string {
        return this.requestData?.url ?? '';
    }

    get originalUrl(): string {
        return this.requestData?.url ?? '';
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

    redirect(_url: string, _status?: number): void {
        return;
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
                return name ? this.getHeader(name) : (this.requestData?.headers ?? {});
            case 'payload':
            case 'body': {
                const body = this.requestData?.body ?? this.requestData?.payload;
                return name ? body?.[name] : body;
            }
            case 'params': {
                const params = this.requestData?.params;
                return name ? params?.[name] : params;
            }
            case 'query': {
                const query = this.requestData?.query;
                return name ? query?.[name] : query;
            }
            case 'path': {
                const paths = this.requestData?.paths;
                return name ? paths?.[name] : paths;
            }
            case 'topic':
                return this.requestData?.method;
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

    getHeader(name: string): any {
        return this.requestData?.headers?.[name.toLowerCase()] ?? this.requestData?.headers?.[name];
    }

    setHeader(name: string, value: Header): void {
        this.responseHeaders.set(name.toLowerCase(), value);
    }

    removeHeader(name: string): void {
        this.responseHeaders.delete(name.toLowerCase());
    }

    getResponseHeaderNames(): string[] {
        return Array.from(this.responseHeaders.keys());
    }

    getResponseHeader(name: string): Header {
        return this.responseHeaders.get(name.toLowerCase());
    }

    write(body: any): void {
        this.responseBody = body;
    }

    setStatus(code: any, message?: string): void {
        this.responseStatus = code;
        if (!isNil(message)) {
            this.responseStatusMessage = message;
        }
    }

    getStatus(): any {
        return this.responseStatus;
    }

    getStatusMessage(): any {
        return this.responseStatusMessage;
    }

    getError(): any {
        return this.responseError;
    }

    getBody(): any {
        return this.responseBody;
    }

    hasHeader(name: string): boolean {
        return this.responseHeaders.has(name.toLowerCase());
    }

    isHeadersSent(): boolean {
        return this.httpResponse.headersSent;
    }

    writeError(error: any): void {
        this.responseError = error;
    }

    /** @inheritDoc */
    sendResponse(res: any, response: any): void {
        const resultBody = this.getBody() ?? (response === this ? undefined : response);

        // JSON-RPC response envelope
        const mcpResponse = {
            jsonrpc: '2.0',
            result: resultBody,
            id: this.requestData?.id ?? null,
        };

        res.statusCode = 200;
        res.setHeader('Content-Type', ContentType.APPL_JSON_UTF8);
        res.end(JSON.stringify(mcpResponse));
    }

    /** @inheritDoc */
    sendError(res: any, err: any): void {
        const status = err?.statusCode ?? err?.status
            ?? (err instanceof BadRequestException || err instanceof ArgumentException || err?.constructor?.name === 'MissingParameterException'
                ? 400
                : err instanceof ForbiddenException
                    ? 403
                    : err instanceof NotFoundException
                        ? 404
                        : 500);
        const expose = typeof err?.expose === 'boolean' ? err.expose : (status >= 400 && status < 500);

        const message = status >= 500 && !expose
            ? 'Internal Server Error'
            : err?.message || err?.statusMessage || 'Error';

        this.setStatus(status, err?.statusMessage);
        this.writeError(err);
        this.write({ statusCode: status, statusMessage: message });

        res.statusCode = status;
        res.setHeader('Content-Type', ContentType.APPL_JSON_UTF8);
        res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: status, message },
            id: this.requestData?.id ?? null,
        }));
    }
}
