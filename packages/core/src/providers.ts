import { Injector, isDefined, ProviderType, ReflectiveFactory, SCOPE_PRODIDERS } from '@tsdi/ioc';
import { ApplicationFactory } from './ApplicationContext';
import { ApplicationRunners } from './ApplicationRunners';
import { RandomUuidGenerator, UuidGenerator } from './uuid';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { DefaultApplicationRunners } from './impl/runners';
import { DefaultApplicationFactory } from './impl/context';
import { DefaultEventMulticaster } from './impl/events';
import { InvocationFactoryResolverImpl } from './impl/invocation';
import { InvocationFactoryResolver } from './invocation';
import { InterceptorResolver } from './Interceptor';
import { FilterHandlerResolver, FilterResolver } from './filters/filter';
import { DefaultFilterResolver, DefaultFiterHandlerMethodResolver, DefaultInterceptorResolver } from './filters/filter.impl';
import { ExecptionHandlerFilter } from './filters/execption.filter';
import { getResolverToken } from './handlers/resolver';
import { PayloadApplicationEvent } from './events';
import { createPayloadResolver } from './handlers/resolvers';
import { TRANSFORM_PROVIDERS } from './pipes/transform';



/**
 * Platform default providers
 */
export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: InvocationFactoryResolver, useFactory: (factory) => new InvocationFactoryResolverImpl(factory), deps: [ReflectiveFactory], static: true },
    { provide: ApplicationFactory, useClass: DefaultApplicationFactory, static: true },
    { provide: UuidGenerator, useClass: RandomUuidGenerator, asDefault: true, static: true }
]

export const RESOLVER_PROVIDERS = [
    { provide: InterceptorResolver, useFactory: () => new DefaultInterceptorResolver(), static: true },
    { provide: FilterResolver, useFactory: () => new DefaultFilterResolver(), static: true },
    { provide: FilterHandlerResolver, useFactory: () => new DefaultFiterHandlerMethodResolver(), static: true },
    { provide: ApplicationEventMulticaster, useFactory: (injector: Injector) => new DefaultEventMulticaster(injector), deps: [Injector], static: true },
    ExecptionHandlerFilter,
]


SCOPE_PRODIDERS.push(...RESOLVER_PROVIDERS);

/**
 * Application root dependence providers
 */
export const ROOT_DEPENDENCE_PROVIDERS: ProviderType[] = [
    ...TRANSFORM_PROVIDERS,
    ...RESOLVER_PROVIDERS,
    {
        provide: getResolverToken(PayloadApplicationEvent),
        useValue: createPayloadResolver(
            (ctx, scope, field) => {
                let payload = ctx.args;
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

