import { importProvidersFrom } from '@tsdi/ioc';
import { REQUEST, StatusMessageAdapter, Transport, TransferSide } from '@tsdi/common';
import * as dgram from 'node:dgram';
import { UdpServer } from './udp-server';
import { UdpServOptions, UDP_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, ServiceTransportFeature } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { SOCKET, useBrokerMessageTransfer } from '@tsdi/transport';
import { UdpMessageAdapter } from './message-adapter';
import { UdpMessageAdapterFactory } from './message-adapter.factory';
import { UdpMicroPatternFormatter } from '../pattern-formatter';

function isUdpSocket(socket: unknown): socket is dgram.Socket {
    return !!socket && typeof (socket as dgram.Socket).send === 'function';
}

const UDP_MESSAGE_SENT = 'udp-message-sent';

const useUdpMessageTransfer = () => useBrokerMessageTransfer<{ message: Buffer, rinfo?: dgram.RemoteInfo, framed?: boolean, id?: any }, Record<string, any>>({
    canHandle: (input) => !!input && Buffer.isBuffer(input.message),
    normalize: ({ message, rinfo, framed, id }) => {
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
            ...(id !== undefined && id !== null ? { id } : {}),
            ...(rinfo ? { rinfo } : {}),
            ...(framed !== undefined ? { framed } : {}),
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
        isSent: (context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            if (requestData?.observe === 'observe') {
                return false;
            }
            return context.has(UDP_MESSAGE_SENT) ? context.get(UDP_MESSAGE_SENT) : false;
        },
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
        },
        afterSuccess: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            if (requestData?.observe !== 'observe') {
                context.set(UDP_MESSAGE_SENT, true);
            }
        },
        afterError: (_error, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            if (requestData?.observe !== 'observe') {
                context.set(UDP_MESSAGE_SENT, true);
            }
        }
    }
});

export function udpTransportFactory(option: Partial<UdpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const formatter = option.formatter ?? UdpMicroPatternFormatter;
    const routerFormatter = typeof option.features?.router === 'object' && option.features.router.formatter
        ? option.features.router.formatter
        : formatter;
    const config = {
        transport: Transport.UDP,
        side: TransferSide.server,
        microservice: true,
        formatter,
        ...option,
        features: {
            defaultTransfer: useUdpMessageTransfer(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: routerFormatter
            }
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as UdpServOptions;

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: UDP_SERV_OPTIONS,
        serverType: UdpServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            UdpMicroPatternFormatter,
            UdpMessageAdapter,
            UdpMessageAdapterFactory
        ]
    });
}

export function useUdpTransport(...options: Partial<UdpServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => udpTransportFactory(option, options.length === 1 && option.asDefault));
}
