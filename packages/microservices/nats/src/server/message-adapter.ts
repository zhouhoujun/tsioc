import { Injectable, isNil } from '@tsdi/ioc';
import { Header, StatusMessageAdapter } from '@tsdi/common';
import { NatsConnection } from 'nats';

@Injectable()
export class NatsMessageAdapter extends StatusMessageAdapter<Record<string, any>, NatsConnection, any> {
    private responseHeaders = new Map<string, Header>();
    private responseStatus: any;
    private responseStatusMessage?: string;

    constructor(
        private requestData: Record<string, any>,
        private nc: NatsConnection,
    ) {
        super();
    }

    get request(): Record<string, any> {
        return this.requestData;
    }

    get response(): NatsConnection {
        return this.nc;
    }

    get status(): any {
        return this.responseStatus;
    }

    set status(value: any) {
        this.setStatus(value);
    }

    get isHandled(): boolean {
        return !isNil(this.status) || !isNil(this.payload) || !isNil(this.error);
    }

    get isCommitted(): boolean {
        return false;
    }

    get query(): Record<string, any> {
        return this.requestData?.query ?? {};
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

    setRequestData(request: any): void {
        this.requestData = request ?? {};
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
                return this.requestData?.topic ?? this.requestData?.url;
            case 'status':
                return this.status;
            case 'statusMessage':
                return this.getStatusMessage();
            case 'error':
                return this.error;
            default:
                return undefined;
        }
    }

    getHeader(name: string): any {
        return this.requestData?.headers?.[name.toLowerCase()] ?? this.requestData?.headers?.[name];
    }

    protected onPayloadChange(payload: any): any {
        return payload;
    }

    protected onErrorChange(error: any): any {
        if (isNil(error)) {
            this.payload = null;
            return null;
        }
        return error;
    }

    setHeader(name: string, value: Header): this {
        this.responseHeaders.set(name.toLowerCase(), value);
        return this;
    }

    removeHeader(name: string): this {
        this.responseHeaders.delete(name.toLowerCase());
        return this;
    }

    getResponseHeaderNames(): string[] {
        return Array.from(this.responseHeaders.keys());
    }

    getResponseHeader(name: string): Header {
        return this.responseHeaders.get(name.toLowerCase());
    }

    /**
     * Write response body. Delegates to setPayload().
     */
    write(body: any): void {
        this.payload = body;
    }

    /**
     * Read response body. Delegates to payload property.
     */
    getBody(): any {
        return this.payload;
    }

    setStatus(code: any, message?: string): this {
        this.responseStatus = code;
        if (!isNil(message)) {
            this.responseStatusMessage = message;
        }
        return this;
    }

    getStatus(): any {
        return this.responseStatus;
    }

    getStatusMessage(): any {
        return this.responseStatusMessage;
    }

    getError(): any {
        return this.error;
    }

    hasHeader(name: string): boolean {
        return this.responseHeaders.has(name.toLowerCase());
    }

    isHeadersSent(): boolean {
        return false;
    }

    writeError(error: any): void {
        this.setError(error);
    }

    /**
     * Send the adapter's response payload via the NATS message respond callback.
     */
    sendResponse(response?: any): void {
        const respond = this.requestData?._respond;
        if (!respond) return;

        const body = !isNil(this.payload) ? this.payload
            : response === this ? undefined : response;
        if (body === undefined) return;

        respond({ payload: body });
    }

    /**
     * Send an error response via the NATS message respond callback.
     */
    sendError(err: any): void {
        const respond = this.requestData?._respond;
        if (!respond) return;

        this.setError(err);
        this.setStatus(err?.statusCode || err?.status || 500);

        const errorBody = {
            error: err?.message || err?.statusMessage || 'Error',
            statusCode: err?.statusCode || err?.status || 500,
            ...(err?.details ? { details: err.details } : {}),
        };
        this.setPayload(errorBody);
        respond(errorBody);
    }
}
