import { Provider, token, Type, toProvider } from '@tsdi/ioc';
import { Binder, BinderConfig } from './binder';
import { TransportConfig, Transport } from '@tsdi/common';

export const BINDER_TRANSPORT_FEATURES = token<BinderTransportFeature[]>('BINDER_TRANSPORT_FEATURES');

export interface BinderTransportFeature {
    transport: Transport;
    binderType: Type<Binder>;
    binderConfig: BinderConfig & TransportConfig;
    providers?: Provider[];
}

export function withBinderTransport(
    binderType: Type<Binder>,
    binderConfig: BinderConfig & TransportConfig,
    extraProviders?: Provider[]
): BinderTransportFeature {
    return {
        transport: binderConfig.transport ?? Transport.TCP,
        binderType,
        binderConfig,
        providers: extraProviders
    };
}

export function provideBinderClient(feature: BinderTransportFeature): Provider[] {
    return [
        { provide: Binder, useClass: feature.binderType },
        { provide: BINDER_TRANSPORT_FEATURES, useValue: feature, multi: true },
        ...(feature.providers ?? [])
    ];
}

export function provideBinderServer(feature: BinderTransportFeature): Provider[] {
    return [
        { provide: Binder, useClass: feature.binderType },
        { provide: BINDER_TRANSPORT_FEATURES, useValue: feature, multi: true },
        ...(feature.providers ?? [])
    ];
}