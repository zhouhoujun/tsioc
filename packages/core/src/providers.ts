import { ProviderType } from '@tsdi/ioc';
import { ApplicationFactory } from './context';
import { ApplicationRunners } from './runners';
import { RandomUuidGenerator, UuidGenerator } from './uuid';
import { ApplicationEventMulticaster } from './events';
import { DefaultApplicationRunners } from './impl/runners';
import { DefaultApplicationFactory } from './impl/context';
import { DefaultEventMulticaster } from './impl/events';
import { EndpointFactoryResolver } from './filters/endpoint.factory';
import { FILTER_PROVIDERS } from './filters/filter.providers';
import { EndpointFactoryResolverImpl } from './impl/endpoint';



export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: EndpointFactoryResolver, useClass: EndpointFactoryResolverImpl, static: true },
    { provide: ApplicationFactory, useClass: DefaultApplicationFactory, static: true },
    { provide: UuidGenerator, useClass: RandomUuidGenerator, asDefault: true, static: true }
]

export const ROOT_DEFAULT_PROVIDERS: ProviderType[] = [
    ...FILTER_PROVIDERS,
    { provide: ApplicationEventMulticaster,  useClass: DefaultEventMulticaster, static: true },
    { provide: ApplicationRunners, useClass: DefaultApplicationRunners, static: true }
]
