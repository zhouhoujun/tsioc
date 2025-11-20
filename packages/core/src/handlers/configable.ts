import { ProvdierOf, StaticProvider, Type, Abstract, Token, AbstractType, InvokeProviders, InvocationContext, TailNext, HandleResult } from '@tsdi/ioc';
import { GuardLike, GuardsService } from '../guard';
import { InterceptorLike, InterceptorService } from '../ApplicationInterceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { FilterLike, FilterService } from '../filters/filter';
import { Handler, HandlerLike, RunableContext } from '../ApplicationHandler';



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
    TContext extends RunableContext = RunableContext> implements Handler<TInput, TOutput, TContext>, HandlerService {

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
    abstract useInterceptors(interceptor: ProvdierOf<InterceptorLike<TInput>> | ProvdierOf<InterceptorLike<TInput>>[], order?: number): this;

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
     * @param tail next tail.
     */
    abstract handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): HandleResult<TOutput>;

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
    handlerType?: AbstractType<Handler>;
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
    interceptors?: ProvdierOf<InterceptorLike<TInput>>[];
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
    interceptorsToken?: Token<InterceptorLike<TInput>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<GuardLike<TInput>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<FilterLike<TInput>[]>;


    backend?: Token<HandlerLike<TInput>> | HandlerLike<TInput>;
}

