import { Injector, ProvdierOf, StaticProvider, ClassType, Abstract, Token, Type, InvokeProviders, Invocation } from '@tsdi/ioc';
import { GuardLike, GuardsService } from '../guard';
import { ApplicationInterceptorLike, InterceptorService } from '../ApplicationInterceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { FilterLike, FilterService } from '../filters/filter';
import { Backend, BackendFn, ApplicationHandler } from '../ApplicationHandler';
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
    TContext = any> implements ApplicationHandler<TInput, TOutput, TContext>, HandlerService {
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
 * Configable handler options.
 */
export interface ConfigableHandlerOptions<TInput = any> extends InvokeProviders {
    /**
     * handler type.
     */
    handlerType?: Type<ApplicationHandler>;
    /**
     * enable input type filters and interceptors chain for handler.
     */
    enableTypeChain?: boolean;
    /**
     * execption handlers
     */
    execptionHandlers?: ClassType<any> | ClassType[] | null;
    
    /**
     * An array of dependency-injection tokens used to look up `GuardLike()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<GuardLike<TInput>>[];
    /**
     * interceptors of bootstrap.
     */
    interceptors?: ProvdierOf<ApplicationInterceptorLike<TInput>>[];
    /**
     * pipes for the bootstrap.
     */
    pipes?: StaticProvider<PipeTransform>[];
    /**
     * filters of bootstrap.
     */
    filters?: ProvdierOf<FilterLike<TInput>>[];
    
    /**
     * interceptors token.
     */
    interceptorsToken?: Token<ApplicationInterceptorLike<TInput>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<GuardLike<TInput>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<FilterLike<TInput>[]>;

    
    backend?: Token<Backend<TInput>> | Token<BackendFn<TInput>> | Backend<TInput> | BackendFn<TInput>;
}

