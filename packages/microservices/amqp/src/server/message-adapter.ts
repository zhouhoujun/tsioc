import { Injectable, isNil } from '@tsdi/ioc';
import { Header, StatusMessageAdapter } from '@tsdi/common';
import * as amqp from 'amqplib';

@Injectable()
export class AmqpMessageAdapter extends StatusMessageAdapter<Record<string, any>, amqp.Channel, any> {
    private responseHeaders = new Map<string, Header>();
    private responseStatus: any;
    private responseStatusMessage?: string;
    private responseError: any;

    constructor(
        private requestData: Record<string, any>,
        private channel: amqp.Channel,
    ) {
        super();
    }

    get request(): Record<string, any> {
        return this.requestData;
    }

    get response(): amqp.Channel {
        return this.channel;
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

    setStatus(code: any, message?: string): this {
        this.responseStatus = code;
        if (!isNil(message)) {
            this.responseStatusMessage = message;
        }
        return this;
    }

    getStatusMessage(): any {
        return this.responseStatusMessage;
    }

    get error(): any {
        return this.responseError;
    }

    set error(error: any) {
        this.responseError = error;
    }

    setError(error: any): this {
        this.responseError = error;
        return this;
    }

    getError(): any {
        return this.responseError;
    }

    getBody(): any {
        return this.payload;
    }

    hasHeader(name: string): boolean {
        return this.responseHeaders.has(name.toLowerCase());
    }

    isHeadersSent(): boolean {
        return false;
    }

    /**
     * Send the adapter's response payload to the AMQP reply-to queue.
     * If no replyTo is set, this is a no-op (the message will still be acked
     * by the caller).
     */
    sendResponse(response?: any): void {
        const channel = this.channel;
        if (!channel) return;
        const replyTo = this.requestData?.replyTo;
        if (isNil(replyTo)) return;

        const correlationId = this.requestData?.correlationId;
        const body = !isNil(this.payload) ? this.payload
            : response === this ? undefined : response;
        const buf = Buffer.from(JSON.stringify({ payload: body }));
        channel.sendToQueue(replyTo, buf, { correlationId });
    }

    /**
     * Send an error response to the AMQP reply-to queue.
     * Sets error state on the adapter and publishes error details.
     */
    sendError(err: any): void {
        const channel = this.channel;
        if (!channel) return;

        this.setError(err);
        const errorBody = {
            error: err?.message || err?.statusMessage || 'Error',
            statusCode: err?.statusCode || err?.status || 500,
            ...(err?.details ? { details: err.details } : {}),
        };
        this.setPayload(errorBody);

        const replyTo = this.requestData?.replyTo;
        if (!isNil(replyTo)) {
            const correlationId = this.requestData?.correlationId;
            const buf = Buffer.from(JSON.stringify({ payload: errorBody }));
            channel.sendToQueue(replyTo, buf, { correlationId });
        }
    }
}
