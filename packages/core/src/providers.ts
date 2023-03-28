import { ProviderType } from '@tsdi/ioc';
import { ApplicationFactory } from './ApplicationContext';
import { ApplicationRunners } from './ApplicationRunners';
import { RandomUuidGenerator, UuidGenerator } from './uuid';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { DefaultApplicationRunners } from './impl/runners';
import { DefaultApplicationFactory } from './impl/context';
import { DefaultEventMulticaster } from './impl/events';
import { EndpointFactoryResolver } from './endpoints/endpoint.factory';
import { EndpointFactoryResolverImpl } from './impl/operation.endpoint';



export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: EndpointFactoryResolver, useClass: EndpointFactoryResolverImpl, static: true },
    { provide: ApplicationFactory, useClass: DefaultApplicationFactory, static: true },
    { provide: UuidGenerator, useClass: RandomUuidGenerator, asDefault: true, static: true }
]

export const ROOT_DEFAULT_PROVIDERS: ProviderType[] = [
    { provide: ApplicationEventMulticaster,  useClass: DefaultEventMulticaster, static: true },
    { provide: ApplicationRunners, useClass: DefaultApplicationRunners, static: true }
]
