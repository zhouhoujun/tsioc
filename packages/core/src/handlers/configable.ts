import {
    Injector, InvokerOptions, ProvdierOf, StaticProvider, ClassType, Abstract, Token
} from '@tsdi/ioc';
import { GuardLike, GuardsService } from '../guard';
import { InterceptorLike, InterceptorService } from '../Interceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { FilterLike, FilterService } from '../filters/filter';
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
    abstract useInterceptors(interceptor: ProvdierOf<InterceptorLike<TInput, TOutput>> | ProvdierOf<InterceptorLike<TInput, TOutput>>[], order?: number): this;

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


export interface BackendOptions<TInput = any> {
    backend?: Token<Backend<TInput>> | Backend<TInput>
}

export interface GuardHandlerOptions<TInput = any> extends BackendOptions<TInput> {
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
