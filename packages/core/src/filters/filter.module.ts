import { EMPTY, getClass, Injectable, isFunction, isString, ProviderType, Type, ArgumentExecption, Module } from '@tsdi/ioc';
import { Handler } from '../Handler';
import { PayloadApplicationEvent } from '../events';
import { getResolversToken } from '../endpoints/resolver';
import { primitiveResolvers } from '../endpoints/resolvers';
import { TransformModule } from '../pipes/transform.module';
import { ExecptionHandlerFilter } from './execption.filter';
import { FilterHandlerResolver } from './filter';
/**
 * endpoint hanlders resolver.
 */
@Injectable()
export class DefaultEndpointHandlerMethodResolver extends FilterHandlerResolver {

    private maps = new Map<Type | string, Handler[]>();

    resolve<T>(filter: Type<T> | T | string): Handler[] {
        return this.maps.get(isString(filter) ? filter : (isFunction(filter) ? filter : getClass(filter))) ?? EMPTY
    }

    addHandle(filter: Type | string, handler: Handler, order?: number): this {
        if (!handler) {
            throw new ArgumentExecption('endpoint missing');
        }
        let hds = this.maps.get(filter);
        if (!hds) {
            hds = [handler];
            this.maps.set(filter, hds)
        } else if (!hds.some(h => h.equals ? h.equals(handler) : h === handler)) {
            hds.push(handler)
        }
        return this
    }

    removeHandle(filter: Type | string, handler: Handler): this {
        const hds = this.maps.get(filter);
        if (!hds) return this;
        const idx = hds.findIndex(h => h.equals ? h.equals(handler) : h === handler);
        if (idx > 0) hds.splice(idx, 1);
        return this
    }
}


/**
 * filter providers.
 */
export const FILTER_PROVIDERS: ProviderType[] = [
    { provide: FilterHandlerResolver, useClass: DefaultEndpointHandlerMethodResolver, static: true },
    ExecptionHandlerFilter,
    { provide: getResolversToken(PayloadApplicationEvent), useValue: primitiveResolvers }
]


@Module({
    imports: [
        TransformModule,
    ],
    providers: [
        ...FILTER_PROVIDERS
    ],
    exports: [
        TransformModule
    ]
})
export class FilterModule {

}

