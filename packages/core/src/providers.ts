import { Injector, isDefined, Provider, SCOPE_PRODIDERS } from '@tsdi/ioc';
import { ApplicationContextFactory } from './ApplicationContext';
import { ApplicationRunners } from './ApplicationRunners';
import { RandomUuidGenerator, UuidGenerator } from './uuid';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { DefaultApplicationRunners } from './impl/runners';
import { DefaultApplicationContextFactory } from './impl/context';
import { DefaultEventMulticaster } from './impl/events';
import { InterceptorResolver } from './ApplicationInterceptor';
import { FilterHandlerResolver, FilterResolver } from './filters/filter';
import { DefaultFilterResolver, DefaultFiterHandlerMethodResolver, DefaultInterceptorResolver } from './filters/filter.impl';
import { ExceptionHandlerFilter } from './filters/execption.filter';
import { getResolverToken } from './handlers/resolver';
import { PayloadApplicationEvent } from './events';
import { createPayloadResolver } from './handlers/resolvers';



/**
 * Platform default providers
 */
export const DEFAULTA_PROVIDERS: Provider[] = [
    { provide: ApplicationContextFactory, useClass: DefaultApplicationContextFactory, static: true },
    { provide: UuidGenerator, useClass: RandomUuidGenerator, asDefault: true, static: true }
]

export const RESOLVER_PROVIDERS = [
    { provide: InterceptorResolver, useFactory: (injector: Injector) => new DefaultInterceptorResolver(injector), deps: [Injector], static: true },
    { provide: FilterResolver, useFactory: (injector: Injector) => new DefaultFilterResolver(injector), deps: [Injector], static: true },
    { provide: FilterHandlerResolver, useFactory: (injector: Injector) => new DefaultFiterHandlerMethodResolver(injector), deps: [Injector], static: true },
    { provide: ApplicationEventMulticaster, useFactory: (injector: Injector) => new DefaultEventMulticaster(injector), deps: [Injector], static: true },
    ExceptionHandlerFilter,
]


SCOPE_PRODIDERS.push(RESOLVER_PROVIDERS);

/**
 * Application root dependence providers
 */
export const ROOT_DEPENDENCE_PROVIDERS: Provider[] = [
    RESOLVER_PROVIDERS,
    {
        provide: getResolverToken(PayloadApplicationEvent),
        useValue: createPayloadResolver(
            (ctx, scope, field) => {
                let payload = ctx.payload;
                if (scope) {
                    payload = payload[scope];
                    if (field) {
                        payload = isDefined(payload) ? payload[field] : null;
                    }
                } else if (field) {
                    payload = null;
                }
                return payload;
            },
            (param, payload) => payload && param.scope && isDefined(payload[param.scope])
        )
    },
    { provide: ApplicationRunners, useClass: DefaultApplicationRunners, static: true },
]

