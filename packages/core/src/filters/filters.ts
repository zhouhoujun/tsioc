import { ProviderType, isDefined } from '@tsdi/ioc';
import { PayloadApplicationEvent } from '../events';
import { getResolverToken } from '../handlers/resolver';
import { createPayloadResolver } from '../handlers/resolvers';
import { ExecptionHandlerFilter } from './execption.filter';
import { FilterHandlerResolver, FilterResolver } from './filter';
import { InterceptorResolver } from '../Interceptor';
import { DefaultFilterResolver, DefaultFiterHandlerMethodResolver, DefaultInterceptorResolver } from './filter.impl';




/**
 * filter providers.
 */
export const FILTER_PROVIDERS: ProviderType[] = [
    { provide: InterceptorResolver, useClass: DefaultInterceptorResolver, static: true },
    { provide: FilterResolver, useClass: DefaultFilterResolver, static: true },
    { provide: FilterHandlerResolver, useClass: DefaultFiterHandlerMethodResolver, static: true },
    ExecptionHandlerFilter,
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
    }
]
