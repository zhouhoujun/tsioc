import { EMPTY, getClass, Injectable, isFunction, isString, ProviderType, Type, ArgumentExecption, Module } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { TransformModule } from '../pipes/transform.module';
import { CatchFilter, ExecptionHandlerBackend } from './execption.filter';
import { FilterHandlerResolver } from './filter';

/**
 * endpoint hanlders resolver.
 */
@Injectable()
export class DefaultEndpointHandlerMethodResolver extends FilterHandlerResolver {

    private maps = new Map<Type | string, Endpoint[]>();

    resolve<T>(filter: Type<T> | T | string): Endpoint[] {
        return this.maps.get(isString(filter) ? filter : (isFunction(filter) ? filter : getClass(filter))) ?? EMPTY
    }

    addHandle(filter: Type | string, endpoint: Endpoint, order?: number): this {
        if (!endpoint) {
            throw new ArgumentExecption('endpoint missing');
        }
        let hds = this.maps.get(filter);
        if (!hds) {
            hds = [endpoint];
            this.maps.set(filter, hds)
        } else if (!hds.some(h => h.equals ? h.equals(endpoint) : h === endpoint)) {
            hds.push(endpoint)
        }
        return this
    }

    removeHandle(filter: Type | string, endpoint: Endpoint): this {
        const hds = this.maps.get(filter);
        if (!hds) return this;
        const idx = hds.findIndex(h => h.equals ? h.equals(endpoint) : h === endpoint);
        if (idx > 0) hds.splice(idx, 1);
        return this
    }
}


/**
 * filter providers.
 */
export const FILTER_PROVIDERS: ProviderType[] = [
    // PathHanlderFilter,
    // StatusInterceptorFilter,
    { provide: FilterHandlerResolver, useClass: DefaultEndpointHandlerMethodResolver, static: true },
    CatchFilter,
    ExecptionHandlerBackend
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


// @Injectable({ static: true })
// export class PathHanlderFilter implements EndpointFilter<Incoming, Outgoing> {

//     intercept(input: Incoming, next: Endpoint<Incoming, Outgoing>, ctx: EndpointContext): Observable<Outgoing> {
//         if (!input.url) return next.handle(input, ctx);

//         return runHandlers(ctx, input, input.url)
//             .pipe(
//                 mergeMap(r => {
//                     if (ctx.done) return of(r);
//                     return next.handle(input, ctx);
//                 }))
//     }

// }

// @Injectable({ static: true })
// export class StatusInterceptorFilter implements EndpointFilter<Incoming, Outgoing> {

//     intercept(input: Incoming, next: Endpoint<Incoming, Outgoing>, ctx: EndpointContext): Observable<Outgoing> {
//         return next.handle(input, ctx)
//             .pipe(
//                 mergeMap(res => {
//                     return runHandlers(ctx, res, getClass(ctx.status))
//                 })
//             )
//     }

// }

// @Injectable({ static: true })
// export class InOutInterceptorFilter implements Interceptor {

//     intercept(input: any, next: Endpoint<any, any>, ctx: EndpointContext): Observable<any> {
//         return runHandlers(ctx, input, input)
//             .pipe(
//                 mergeMap(r => {
//                     if (ctx.done) return of(r);
//                     return next.handle(input, ctx);
//                 }),
//                 mergeMap(res => {
//                     return runHandlers(ctx, res, res);
//                 })
//             )
//     }

// }
