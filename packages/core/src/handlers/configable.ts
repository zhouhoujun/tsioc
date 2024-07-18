import {
    Injector, InvokerOptions, ProvdierOf, StaticProvider, ClassType, Abstract, Token
} from '@tsdi/ioc';
import { CanActivate, GuardsService } from '../guard';
import { Interceptor, InterceptorService } from '../Interceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { Filter, FilterService } from '../filters/filter';
import { Backend, Handler } from '../Handler';
import { Observable } from 'rxjs';



/**
 * handler service.
 * 
 * 处理器服务
 */
export interface HandlerService extends FilterService, PipeService, InterceptorService, GuardsService { }


/**
 * Configable handler
 */
@Abstract()
export abstract class AbstractConfigableHandler<
    TInput = any,
    TOutput = any,
    TOptions extends ConfigableHandlerOptions<TInput> = ConfigableHandlerOptions<TInput>,
    TContext = any> implements Handler<TInput, TOutput, TContext>, HandlerService {
    abstract get injector(): Injector;
    abstract get ready(): Promise<void>;
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
    abstract useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this;

    /**
     * use guards for the handler.
     * @param guards 
     */
    abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;

    /**
     * use filters for the handler.
     * @param filter 
     * @param order 
     * @returns 
     */
    abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;


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


export interface BackendOptions<TInput = any> {
    backend?: Token<Backend<TInput>> | Backend<TInput>
}

export interface GuardHandlerOptions<TInput = any> extends BackendOptions<TInput> {
    /**
     * interceptors token.
     */
    interceptorsToken?: Token<Interceptor<TInput>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<CanActivate<TInput>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<Filter<TInput>[]>;
}


/**
 * handler service options.
 */
export interface HandlerOptions<TInput = any, TArg = any> extends InvokerOptions<any, TArg> {
    /**
     * An array of dependency-injection tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<CanActivate<TInput>>[];
    /**
     * interceptors of bootstrap.
     */
    interceptors?: ProvdierOf<Interceptor<TInput>>[];
    /**
     * pipes for the bootstrap.
     */
    pipes?: StaticProvider<PipeTransform>[];
    /**
     * filters of bootstrap.
     */
    filters?: ProvdierOf<Filter<TInput>>[];
}


/**
 * Configable handler options.
 */
export interface ConfigableHandlerOptions<TInput = any, TArg = any> extends HandlerOptions<TInput, TArg>, GuardHandlerOptions<TInput>, BackendOptions<TInput> {

    /**
     * execption handlers
     */
    execptionHandlers?: ClassType<any> | ClassType[];
}

export interface TypeConfigableHandlerOptions<TClass extends AbstractConfigableHandler, TInput = any, TArg = any> extends ConfigableHandlerOptions<TInput, TArg> {
    classType: ClassType<TClass>;
}
