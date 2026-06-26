import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, REQUEST, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import * as dgram from 'node:dgram';
import { UdpServer } from './udp-server';
import { UdpServOptions, UDP_SERV_OPTIONS } from './options';
import { AuthInterceptor, MessageAuthInterceptor, ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { SOCKET } from '@tsdi/transport';
import { UdpMessageAdapter } from './message-adapter';
import { UdpMessageAdapterFactory } from './message-adapter.factory';
import { useBrokerMessageTransfer } from '@tsdi/transport';

function isUdpSocket(socket: unknown): socket is dgram.Socket {
    return !!socket && typeof (socket as dgram.Socket).send === 'function';
}

const useUdpMessageTransfer = () => useBrokerMessageTransfer<{ message: Buffer }, Record<string, any>>({
    canHandle: (input) => !!input && Buffer.isBuffer(input.message),
    normalize: ({ message }) => {
        let data = message.toString();
        if (data.endsWith('\r\n')) {
            data = data.slice(0, -2);
        }

        let parsed: any;
        try {
            parsed = JSON.parse(data);
        } catch {
            parsed = data;
        }
        const requestSource: Record<string, any> = parsed && typeof parsed === 'object' ? parsed : {};
        const url = requestSource.url || '/';
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        return {
            ...requestSource,
            url,
            method,
            body,
            payload: body
        };
    },
    adapter: {
        factory: UdpMessageAdapterFactory,
        response: (_input, _requestData, context) => context.get(SOCKET)
    },
    sender: {
        canSend: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!context.get(SOCKET) && !!requestData?.rinfo;
        },
        send: (response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const socket = context.get(SOCKET);
            const rinfo = requestData?.rinfo;
            if (!isUdpSocket(socket) || !rinfo) {
                return;
            }
            let payload = response;
            if (requestData?.id !== undefined && requestData?.id !== null) {
                if (payload === null || payload === undefined || (typeof payload !== 'object' && typeof payload !== 'function')) {
                    payload = { id: requestData.id, payload };
                } else if ((payload as Record<string, any>).id === undefined || (payload as Record<string, any>).id === null) {
                    (payload as Record<string, any>).id = requestData.id;
                }
            }
            adapter?.setPayload(payload);
            const responseText = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const buf = Buffer.from(requestData?.framed ? responseText + '\r\n' : responseText);
            socket.send(buf, rinfo.port, rinfo.address);
        },
        canSendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!err && !!context.get(SOCKET) && !!requestData?.rinfo;
        },
        sendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const socket = context.get(SOCKET);
            const rinfo = requestData?.rinfo;
            if (!isUdpSocket(socket) || !rinfo) {
                return;
            }
            const payload: Record<string, any> = {
                statusCode: err?.statusCode ?? err?.status ?? 500,
                statusMessage: err?.statusMessage || err?.message || 'Internal Server Error',
                message: err?.statusMessage || err?.message || 'Internal Server Error',
                ...(err?.details ? { details: err.details } : {})
            };
            if (requestData?.id !== undefined && requestData?.id !== null) {
                payload.id = requestData.id;
            }
            adapter?.setError(err);
            adapter?.setStatus(err?.statusCode || err?.status || 500, err?.statusMessage || err?.message);
            adapter?.setPayload(payload);
            const responseText = JSON.stringify(payload);
            const buf = Buffer.from(requestData?.framed ? responseText + '\r\n' : responseText);
            socket.send(buf, rinfo.port, rinfo.address);
        }
    }
});

export function udpTransportFactory(option: Partial<UdpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.UDP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useUdpMessageTransfer(),
            ...option.features
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as UdpServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: UDP_SERV_OPTIONS, useValue: config },
    );
    const authProviders: Provider[] = config.features.auth ? [{
        provide: getServiceInterceptorsToken(config),
        useExisting: MessageAuthInterceptor,
        multi: true,
        multiOrder: -300
    } as Provider & { multiOrder: number }] : [];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        UdpMessageAdapter,
        UdpMessageAdapterFactory,
        { provide: AuthInterceptor, useClass: MessageAuthInterceptor },
        { provide: MessageAuthInterceptor, useExisting: AuthInterceptor },
        ...authProviders,
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const adapter = context.get(StatusMessageAdapter);
                const error = new NotFoundException('Not Found', 404);
                if (adapter) {
                    adapter.setStatus(error.statusCode, error.message)
                        .setError(error)
                        .setPayload({ statusCode: error.statusCode, statusMessage: error.message });
                    return of(adapter);
                }
                return of(null);
            },
            multi: true
        },
        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(UdpServer).createInvocation(injector, {
                    providers: [
                        { provide: UDP_SERV_OPTIONS, useValue: config },
                        {
                            provide: ServiceHandler,
                            useFactory: (inj: Injector) => createRequestHandler(inj, config),
                            deps: [Injector]
                        }
                    ]
                });
            },
            deps: [Injector]
        },
        {
            provide: REGISTER_MICRO_SERVICES,
            useFactory: (service) => ({ service, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }),
            deps: [serviceToken],
            multi: true
        }
    ];

    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function useUdpTransport(...options: Partial<UdpServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => udpTransportFactory(option, options.length === 1 && option.asDefault));
}
