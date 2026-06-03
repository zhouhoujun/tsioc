import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { RequestContext, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { CoapServer } from './coap-server';
import { CoapCompatiblePatternFormatter, CoapPatternFormatter } from './pattern';
import { CoapServOptions, COAP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES, BodyParserInterceptor, ContentInterceptor, JsonInterceptor } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { CoapBodyParserInterceptor, CoapContentInterceptor, CoapJsonInterceptor } from './interceptors';
import { CoapMessageAdapter } from './message-adapter';
import { CoapMessageAdapterFactory } from './message-adapter.factory';
import { COAP_SERV_INTERCEPTORS } from '../coap.module';

export function coapTransportFactory(option: Partial<CoapServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.CoAP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter)
                    || (option.compatibility ? CoapCompatiblePatternFormatter : CoapPatternFormatter)
            }
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as CoapServOptions;

    config.features.interceptorsToken ??= COAP_SERV_INTERCEPTORS;
    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: COAP_SERV_OPTIONS, useValue: config },
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        CoapMessageAdapter,
        CoapMessageAdapterFactory,
        CoapPatternFormatter,
        CoapCompatiblePatternFormatter,
        { provide: ContentInterceptor, useClass: CoapContentInterceptor },
        { provide: JsonInterceptor, useClass: CoapJsonInterceptor },
        { provide: BodyParserInterceptor, useClass: CoapBodyParserInterceptor },
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const adapter = context.getMessageAdapter() as CoapMessageAdapter | null;
                if (adapter) {
                    adapter.writeError({ message: 'Not Found' });
                    adapter.setStatus('4.04', 'Not Found');
                    adapter.write({ statusCode: '4.04', statusMessage: 'Not Found' });
                    return of(adapter);
                }
                return of(null);
            },
            multi: true
        },
        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(CoapServer).createInvocation(injector, {
                    providers: [
                        { provide: COAP_SERV_OPTIONS, useValue: config },
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
            useFactory: (service) => {
                return {
                    service,
                    bootstrap: config.bootstrap,
                    microservice: config.microservice,
                    asDefault
                }
            },
            deps: [
                serviceToken
            ],
            multi: true
        }
    ];

    return {
        kind: ServiceFeatureKind.Transport,
        config,
        providers
    };
}

export function useCoapTransport(...options: Partial<CoapServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => coapTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
