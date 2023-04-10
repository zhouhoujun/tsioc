import { Abstract, Type, Class, ReflectiveRef, Injector, OnDestroy, Destroyable, DestroyCallback, InvocationContext, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { Endpoint } from './endpoint';
import { EndpointOptions, EndpointService } from './endpoint.service';


/**
 * Opteration Endpoint
 */
@Abstract()
export abstract class OperationEndpoint<TInput extends InvocationContext = InvocationContext, TOutput = any> extends Endpoint<TInput, TOutput> implements EndpointService {

    abstract get injector(): Injector;

    abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;

    abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;

    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    abstract useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this;
}




/**
 * endpoint factory.
 */
@Abstract()
export abstract class EndpointFactory<T> implements OnDestroy, Destroyable {

    abstract get typeRef(): ReflectiveRef<T>;

    abstract create<TArg>(propertyKey: string, options: EndpointOptions<TArg>): OperationEndpoint;


    destroy(): void {
        this.typeRef.destroy();
    }
    get destroyed(): boolean {
        return this.typeRef.destroyed;
    }

    onDestroy(callback?: DestroyCallback): void {
        this.typeRef.onDestroy(callback);
    }
}

/**
 * endpoint factory resolver.
 */
@Abstract()
export abstract class EndpointFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: ReflectiveRef<T>): EndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>, injector: Injector): EndpointFactory<T>;
}


