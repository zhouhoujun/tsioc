import { ProviderType } from '@tsdi/ioc';
import { ApplicationFactory } from './ApplicationContext';
import { ApplicationRunners } from './ApplicationRunners';
import { RandomUuidGenerator, UuidGenerator } from './uuid';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { DefaultApplicationRunners } from './impl/runners';
import { DefaultApplicationFactory } from './impl/context';
import { DefaultEventMulticaster } from './impl/events';
import { ConfigableHandlerImpl } from './impl/handler';
import { EndpointFactoryResolverImpl } from './impl/operation.endpoint';
import { CONFIGABLE_ENDPOINT_IMPL, EndpointFactoryResolver } from './endpoints/endpoint.factory';
import { CONFIGABLE_HANDLER_IMPL } from './handlers/handler.service';
import { ConfigableEndpointImpl } from './impl/endpoint';


CONFIGABLE_HANDLER_IMPL.create = (injector, options) => new ConfigableHandlerImpl(injector, options)

CONFIGABLE_ENDPOINT_IMPL.create = (injector, options)=> new ConfigableEndpointImpl(injector, options)

/**
 * Platform default providers
 */
export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: EndpointFactoryResolver, useClass: EndpointFactoryResolverImpl, static: true },
    { provide: ApplicationFactory, useClass: DefaultApplicationFactory, static: true },
    { provide: UuidGenerator, useClass: RandomUuidGenerator, asDefault: true, static: true }
]

/**
 * Application root default providers
 */
export const ROOT_DEFAULT_PROVIDERS: ProviderType[] = [
    { provide: ApplicationEventMulticaster,  useClass: DefaultEventMulticaster, static: true },
    { provide: ApplicationRunners, useClass: DefaultApplicationRunners, static: true }
]
