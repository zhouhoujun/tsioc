import { Injector, Provider } from '@tsdi/ioc';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { DefaultEventMulticaster } from './impl/events';
import { InterceptorResolver } from './interceptor';
import { FilterHandlerResolver, FilterResolver } from './filters/filter';
import { DefaultFilterResolver, DefaultFiterHandlerMethodResolver, DefaultInterceptorResolver } from './filters/filter.impl';
import { ExceptionHandlerFilter } from './filters/execption.filter';
/**
 * Platform default providers
 */
export declare const DEFAULTA_PROVIDERS: Provider[];
export declare const RESOLVER_PROVIDERS: (typeof ExceptionHandlerFilter | {
    provide: typeof InterceptorResolver;
    useFactory: (injector: Injector) => DefaultInterceptorResolver;
    deps: (typeof Injector)[];
    static: boolean;
} | {
    provide: typeof FilterResolver;
    useFactory: (injector: Injector) => DefaultFilterResolver;
    deps: (typeof Injector)[];
    static: boolean;
} | {
    provide: typeof FilterHandlerResolver;
    useFactory: (injector: Injector) => DefaultFiterHandlerMethodResolver;
    deps: (typeof Injector)[];
    static: boolean;
} | {
    provide: typeof ApplicationEventMulticaster;
    useFactory: (injector: Injector) => DefaultEventMulticaster;
    deps: (typeof Injector)[];
    static: boolean;
})[];
/**
 * Application root dependence providers
 */
export declare const ROOT_DEPENDENCE_PROVIDERS: Provider[];
