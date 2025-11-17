import { Injector, ProvdierOf, StaticProvider, Type, Abstract, Token, AbstractType, InvokeProviders, InvocationContext } from '@tsdi/ioc';
import { GuardLike, GuardsService } from '../guard';
import { ApplicationInterceptorLike, InterceptorService } from '../ApplicationInterceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { FilterLike, FilterService } from '../filters/filter';
import { ApplicationHandler, ApplicationHandlerLike, RunableContext } from '../ApplicationHandler';
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
    TContext extends RunableContext = RunableContext> implements ApplicationHandler<TInput, TOutput, TContext>, HandlerService {

    abstract get context(): InvocationContext;
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
    abstract useInterceptors(interceptor: ProvdierOf<ApplicationInterceptorLike<TInput>> | ProvdierOf<ApplicationInterceptorLike<TInput>>[], order?: number): this;

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
    abstract useFilters(filter: ProvdierOf<FilterLike<TInput>> | ProvdierOf<FilterLike<TInput>>[], order?: number): this;


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
    handlerType?: AbstractType<ApplicationHandler>;
    /**
     * enable input type filters and interceptors chain for handler.
     */
    enableTypeChain?: boolean;
    /**
     * execption handlers
     */
    execptionHandlers?: Type<any> | Type[] | null;

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


    backend?: Token<ApplicationHandlerLike<TInput>> | ApplicationHandlerLike<TInput>;
}

