import {
    Abstract, Type, Class, ReflectiveRef, Injector, OnDestroy, Destroyable, DestroyCallback,
    InvocationContext, ProvdierOf, StaticProvider, OperationInvoker, Execption, tokenId, isInjector, createContext
} from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { Endpoint } from './endpoint';
import { ConfigableEndpointOptions, EndpointOptions, EndpointService } from './endpoint.service';
import { ConfigableHandler } from '../handlers/configable.handler';


/**
 * Configable Endpoint
 * 
 * 可配置节点
 */
@Abstract()
export abstract class ConfigableEndpoint<TInput extends InvocationContext = InvocationContext, TOutput = any> extends Endpoint<TInput, TOutput> implements EndpointService {

    abstract get injector(): Injector;

    abstract useGuards(guards: ProvdierOf<CanActivate<TInput>> | ProvdierOf<CanActivate<TInput>>[], order?: number): this;

    abstract useFilters(filter: ProvdierOf<Filter<TInput, TOutput>> | ProvdierOf<Filter<TInput, TOutput>>[], order?: number): this;

    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    abstract useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this;

    abstract onDestroy(): void;
}



/**
 * create configable endpoint.
 * @param injector 
 * @param options 
 * @returns 
 */
export function createEndpoint<TInput extends InvocationContext = InvocationContext, TOutput = any>(injector: Injector| InvocationContext, options: ConfigableEndpointOptions<TInput>): ConfigableEndpoint<TInput, TOutput> {
    return new ConfigableHandler(isInjector(injector)? createContext(injector): injector, options);
}



export const OPERA_INTERCEPTORS = tokenId<Interceptor[]>('OPERA_INTERCEPTORS');
export const OPERA_GUARDS = tokenId<CanActivate[]>('OPERA_GUARDS');
export const OPERA_FILTERS = tokenId<Filter[]>('OPERA_FILTERS');

/**
 * Opteration Endpoint
 */
@Abstract()
export abstract class OperationEndpoint<TInput extends InvocationContext = InvocationContext, TOutput = any> extends ConfigableEndpoint<TInput, TOutput> {
    /**
     * opteration invoker.
     */
    abstract get invoker(): OperationInvoker;

    // abstract get options(): EndpointOptions;

    /**
     * is this equals to target or not
     * @param target 
     */
    abstract equals(target: any): boolean;
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


