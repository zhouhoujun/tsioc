import { Abstract, Type, Invocation, OnDestroy, Destroyable, DestroyCallback, Class, ProvidedInMetadata, Injector, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandlerOptions } from './handlers/configable';
import { Observable } from 'rxjs';
import { PipeTransform } from './pipes/pipe';
import { ApplicationInterceptorLike } from './ApplicationInterceptor';
import { GuardLike } from './guard';
import { FilterLike } from './filters/filter';


/**
 * Invocation handler
 */
@Abstract()
export abstract class InvocationHandler<
    TInput = any,
    TOutput = any,
    TOptions extends InvocationOptions = InvocationOptions,
    TContext = any> extends Invocation implements AbstractConfigableHandler<TInput, TOutput, TOptions, TContext> {

    abstract get injector(): Injector;
    
    abstract get ready(): Promise<void>;

    /**
     * get config options.
     */
    abstract getOptions(): TOptions;

    /**
     * use pipes
     * @param pipes 
     * @returns 
     */
    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    abstract useInterceptors(interceptor: ProvdierOf<ApplicationInterceptorLike> | ProvdierOf<ApplicationInterceptorLike>[], order?: number): this;

    /**
     * use guards for the handler.
     * @param guards 
     */
    abstract useGuards(guards: ProvdierOf<GuardLike> | ProvdierOf<GuardLike>[], order?: number): this;

    /**
     * use filters for the handler.
     * @param filter 
     * @param order 
     * @returns 
     */
    abstract useFilters(filter: ProvdierOf<FilterLike> | ProvdierOf<FilterLike>[], order?: number): this;


    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     */
    abstract handle(input: TInput, context?: TContext): Observable<TOutput>;

    /**
     * destroy hooks.
     */
    abstract onDestroy(): void;
}


/**
 * Invocation Handler factory.
 */
@Abstract()
export abstract class InvocationHanlderFactory<T> implements OnDestroy, Destroyable {

    abstract get invocation(): Invocation<T>;

    abstract create<TArg>(propertyKey: string, options?: InvocationOptions<TArg>): InvocationHandler;


    destroy(): void {
        this.invocation.destroy();
    }
    get destroyed(): boolean {
        return this.invocation.destroyed;
    }

    onDestroy(callback?: DestroyCallback): void {
        this.invocation.onDestroy(callback);
    }
}

/**
 * Invocation Handler factory resolver.
 */
@Abstract()
export abstract class InvocationHanlderFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param invocation type invocation
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(invocation: Invocation<T>): InvocationHanlderFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>): InvocationHanlderFactory<T>;
}




/**
 * Respond 
 */
@Abstract()
export abstract class Respond<TInput = any> {
    /**
     * respond with handled data.
     * @param input endpoint input data.
     * @param value handled returnning value
     */
    abstract respond<T>(input: TInput, value: T): void;
}

/**
 * Respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond<TInput = any> {
    /**
     * respond with handled data.
     * @param input input data.
     * @param value handled returnning value
     * @param responseType response type
     */
    abstract respond<T>(input: TInput, value: T, responseType: 'body' | 'header' | 'response'): void;
}



/**
 * Invocation Handler options.
 * 
 * 终结点配置
 */
export interface InvocationOptions<T = any> extends ConfigableHandlerOptions<T>, ProvidedInMetadata {
    /**
     * the endpoint run times limit. 
     */
    limit?: number;
    /**
     * auto bootstrap endpoint attached. default true.
     */
    bootstrap?: boolean;
    /**
     * endpoint order
     */
    order?: number;
    /**
     * endpoint handler response as.
     */
    response?: 'body' | 'header' | 'response' | Type<Respond<T>> | ((input: T, returnning: any) => void)
}
