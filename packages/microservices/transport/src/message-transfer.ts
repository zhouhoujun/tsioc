import { catchError, defer, filter, map, mergeMap, of, throwError } from 'rxjs';
import { ContextToken, Token, isNil } from '@tsdi/ioc';
import { ErrorResponse, MessageAdapter, MessageAdapterFactory, RequestContext, REQUEST, RequestInterceptorFn, StatusMessageAdapter, TransferConfig, TransferFilterFactory, TransferSide } from '@tsdi/common';

export interface BrokerMessageTransferOptions<TInput = any, TRequest = any> {
    canHandle?: (input: TInput, context: any) => boolean;
    normalize: (input: TInput, context: any) => TRequest | Promise<TRequest>;
    adapter?: {
        factory: Token<MessageAdapterFactory<TRequest, any>>;
        response: (input: TInput, requestData: TRequest, context: any) => any;
    };
    sender?: BrokerMessageSender<TRequest>;
}

export interface BrokerMessageSender<TRequest = any> {
    isSent?: (context: RequestContext<TRequest, any>) => boolean;
    canSend?: (response: unknown, context: RequestContext<TRequest, any>) => boolean;
    send?: (response: unknown, context: RequestContext<TRequest, any>) => void;
    canSendError?: (error: unknown, context: RequestContext<TRequest, any>) => boolean;
    sendError?: (error: unknown, context: RequestContext<TRequest, any>) => void;
    afterSuccess?: (response: unknown, context: RequestContext<TRequest, any>) => void;
    afterError?: (error: unknown, context: RequestContext<TRequest, any>) => void;
}

export interface BrokerClientMessageTransferOptions<TRequest = any> {
    mapping?: (value: any, context: RequestContext<TRequest, any>) => any;
    parse?: (message: any, context: RequestContext<TRequest, any>) => any;
    match?: (response: any, request: TRequest, context: RequestContext<TRequest, any>) => boolean;
    normalize?: (response: any, request: TRequest, context: RequestContext<TRequest, any>) => any;
}

const BROKER_MESSAGE_SENT = new ContextToken<boolean>(() => false);

function getStatusAdapter(context: RequestContext): StatusMessageAdapter<any, any, any> | null {
    if (!context.has(StatusMessageAdapter)) {
        return null;
    }
    const adapter = context.get(StatusMessageAdapter);
    return adapter instanceof StatusMessageAdapter ? adapter : null;
}

function getResponseBody(response: unknown, context: RequestContext): unknown {
    const adapter = getStatusAdapter(context);
    if (!adapter) {
        return response;
    }
    if (!isNil(adapter.payload)) {
        return adapter.payload;
    }
    return response === adapter ? undefined : response;
}

function isSent(context: RequestContext, sender?: BrokerMessageSender): boolean {
    if (sender?.isSent) {
        return sender.isSent(context);
    }
    return context.get(BROKER_MESSAGE_SENT);
}

function markSent(context: RequestContext): void {
    context.set(BROKER_MESSAGE_SENT, true);
}

function createBrokerSenderFilter<TRequest = any>(sender?: BrokerMessageSender<TRequest>): RequestInterceptorFn<TRequest, any, RequestContext<TRequest, any>> {
    return (input, next, context) => {
        return next(input, context).pipe(
            mergeMap((response: unknown) => {
                const outbound = getResponseBody(response, context);
                if (sender && !isSent(context, sender)) {
                    if (sender.canSend ? sender.canSend(outbound, context) : true) {
                        sender.send?.(outbound, context);
                        markSent(context);
                    }
                    sender.afterSuccess?.(outbound, context);
                }
                return of(response);
            }),
            catchError((err) => {
                if (sender && !isSent(context, sender)) {
                    if (sender.canSendError ? sender.canSendError(err, context) : (sender.canSend ? sender.canSend(err, context) : true)) {
                        sender.sendError?.(err, context);
                        markSent(context);
                    }
                    sender.afterError?.(err, context);
                }
                return throwError(() => err);
            })
        );
    };
}

export function useBrokerMessageTransfer<TInput = any, TRequest = any>(
    options: BrokerMessageTransferOptions<TInput, TRequest>
): TransferFilterFactory {
    return (config: TransferConfig) => {
        if (config.side !== TransferSide.server) {
            return [];
        }

        const interceptor: RequestInterceptorFn<TInput, any, any> = (input, next, context) => {
            if (context.has(MessageAdapter)) {
                return next(input, context);
            }
            if (options.canHandle && !options.canHandle(input, context)) {
                return next(input, context);
            }
            return defer(() => Promise.resolve(options.normalize(input, context)) as Promise<any>).pipe(
                mergeMap((requestData: any) => {
                    context.set(REQUEST, requestData);
                    let adapter: MessageAdapter<TRequest, any> | null = null;
                    if (options.adapter) {
                        const factory = context.getInjector().get(options.adapter.factory, null);
                        if (factory) {
                            adapter = factory.create({
                                request: requestData,
                                response: options.adapter.response(input, requestData, context),
                                context
                            });
                            context.setMessageAdapter(adapter);
                        }
                    }
                    if (adapter) {
                        const forked = adapter.forkRequest(requestData);
                        if (forked !== adapter) {
                            context.setMessageAdapter(forked);
                            context.setPayload(forked);
                        } else {
                            adapter.setRequestData(requestData);
                            context.setPayload(adapter);
                        }
                    } else {
                        context.setPayload(requestData);
                    }
                    return next(requestData, context);
                })
            );
        };

        return {
            filters: [interceptor, createBrokerSenderFilter(options.sender)]
        };
    };
}

function parseBrokerClientMessage<TRequest = any>(message: any, context: RequestContext<TRequest, any>, parser?: (message: any, context: RequestContext<TRequest, any>) => any): any {
    if (parser) {
        return parser(message, context);
    }
    if (typeof message === 'string' || Buffer.isBuffer(message)) {
        const raw = message.toString();
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    return message;
}

function normalizeBrokerClientResponse<TRequest = any>(parsed: any, request: TRequest & { observe?: string; responseType?: any }, context: RequestContext<TRequest, any>, normalizer?: (response: any, request: TRequest, context: RequestContext<TRequest, any>) => any): any {
    if (normalizer) {
        return normalizer(parsed, request, context);
    }
    if (parsed && typeof parsed === 'object' && ('status' in parsed || 'statusCode' in parsed || 'ok' in parsed || 'body' in parsed || 'payload' in parsed || 'error' in parsed)) {
        const status = parsed.status ?? parsed.statusCode ?? (parsed.error ? 500 : 200);
        const statusMessage = parsed.statusMessage ?? parsed.statusText ?? parsed.error?.message ?? (status >= 400 ? 'Error' : 'OK');
        const body = !isNil(parsed.body) ? parsed.body : parsed.payload;
        return {
            ...parsed,
            status,
            statusCode: parsed.statusCode ?? status,
            statusMessage,
            statusText: statusMessage,
            ok: parsed.ok ?? (!parsed.error && status < 400),
            body,
            payload: !isNil(body) ? body : parsed.payload,
            error: parsed.error,
            headers: parsed.headers ?? {}
        };
    }
    return {
        status: 200,
        statusCode: 200,
        statusMessage: 'OK',
        statusText: 'OK',
        ok: true,
        body: parsed,
        payload: parsed,
        headers: {},
        responseType: request?.responseType
    };
}

export function useBrokerClientTransfer<TRequest = any>(
    options: BrokerClientMessageTransferOptions<TRequest> = {}
): TransferFilterFactory {
    return (config: TransferConfig) => {
        if (config.side !== TransferSide.client) {
            return [];
        }

        const requestMapper: RequestInterceptorFn<TRequest, any, RequestContext<TRequest, any>> = (input, next, context) => {
            const request = context.get(REQUEST) as ({ id?: string | number } & TRequest) | undefined;
            if (request && request.id == null) {
                request.id = `${Date.now()}-${Math.random()}`;
            }
            return next(options.mapping ? options.mapping(input, context) : input, context);
        };

        const responseMapper: RequestInterceptorFn<TRequest, any, RequestContext<TRequest, any>> = (input, next, context) => {
            return next(input, context).pipe(
                map((response: any) => parseBrokerClientMessage(response, context, options.parse)),
                filter((response: any) => {
                    const request = context.get(REQUEST) as TRequest;
                    return options.match ? options.match(response, request, context) : true;
                }),
                mergeMap((response: any) => {
                    const request = context.get(REQUEST) as TRequest & { observe?: string; responseType?: any };
                    const normalized = normalizeBrokerClientResponse(response, request, context, options.normalize);
                    if (request?.observe === 'response') {
                        return of(normalized);
                    }
                    if (!normalized.ok) {
                        return throwError(() => new ErrorResponse({
                            status: normalized.status,
                            statusMessage: normalized.statusMessage,
                            statusText: normalized.statusText,
                            headers: normalized.headers,
                            error: normalized.error ?? normalized.body ?? normalized.payload
                        }));
                    }
                    return of(normalized.body ?? normalized.payload ?? normalized);
                })
            );
        };

        return {
            filters: [requestMapper, responseMapper]
        };
    };
}
