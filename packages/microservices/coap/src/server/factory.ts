import { importProvidersFrom } from '@tsdi/ioc';
import { RequestContext, RequestFilterLike, StatusMessageAdapter, Transport, TransferSide } from '@tsdi/common';
import { of } from 'rxjs';
import { CoapServer } from './coap-server';
import { CoapServOptions, COAP_SERV_OPTIONS } from './options';
import { CoapCompatiblePatternFormatter, CoapPatternFormatter } from './pattern';
import {
    BodyParserInterceptor,
    ContentInterceptor,
    createServiceTransportFeature,
    getServiceBackendToken,
    JsonInterceptor,
    ServiceTransportFeature
} from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { CoapBodyParserInterceptor, CoapContentInterceptor, CoapJsonInterceptor } from './interceptors';
import { CoapMessageAdapter } from './message-adapter';
import { CoapMessageAdapterFactory } from './message-adapter.factory';
import { COAP_SERV_INTERCEPTORS } from '../coap.module';
import { CoapNormalizeAdapterFilter } from './normalize-filter';
import { CoapTransportSenderFilter } from './sender-filter';

const useCoapMessageTransfer = () => () => ({
    filters: [
        CoapNormalizeAdapterFilter as unknown as RequestFilterLike,
        CoapTransportSenderFilter as unknown as RequestFilterLike
    ]
});

export function coapTransportFactory(option: Partial<CoapServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.CoAP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            ...option.features,
            ...(option.features?.defaultTransfer ? {} : { defaultTransfer: useCoapMessageTransfer() }),
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter)
                    || (option.compatibility ? CoapCompatiblePatternFormatter : CoapPatternFormatter)
            }
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as CoapServOptions;

    config.features.interceptorsToken ??= COAP_SERV_INTERCEPTORS;
    const backendToken = getServiceBackendToken(config);
    const backendProvider = {
        provide: backendToken,
        useValue: (_req: any, context: RequestContext): any => {
            const adapter = context.get(StatusMessageAdapter);
            if (adapter) {
                adapter.setStatus('4.04', 'Not Found')
                    .setError(new Error('Not Found'))
                    .setPayload({ statusCode: '4.04', statusMessage: 'Not Found' });
                return of(adapter);
            }
            return of(null);
        },
        multi: true
    };

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: COAP_SERV_OPTIONS,
        serverType: CoapServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            CoapNormalizeAdapterFilter,
            CoapTransportSenderFilter,
            CoapMessageAdapter,
            CoapMessageAdapterFactory,
            CoapPatternFormatter,
            CoapCompatiblePatternFormatter,
            { provide: ContentInterceptor, useClass: CoapContentInterceptor },
            { provide: JsonInterceptor, useClass: CoapJsonInterceptor },
            { provide: BodyParserInterceptor, useClass: CoapBodyParserInterceptor }
        ],
        backendProvider
    });
}

export function useCoapTransport(...options: Partial<CoapServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => coapTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
