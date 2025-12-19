import { ProvdierOf, StaticProvider, Type, Abstract, Token, AbstractType, InvokeProviders, InvocationContext, TailNext, HandleResult, isPlainObject } from '@tsdi/ioc';
import { GuardLike } from '../guard';
import { InterceptorLike } from '../interceptor';
import { PipeTransform } from '../pipes/pipe';
import { FilterLike } from '../filters/filter';
import { Handler, HandlerLike, RunContext } from '../handler';



/**
 * handler service.
 * 
 * 处理器服务
 */
export interface HandlerAppendService<TInput, TOutput = any, TContext = any> {
    /**
     * use interceptor for this handler.
     * @param inteceptor
     * @param order mutil order
     */
    use(inteceptor: ProvdierOf<InterceptorLike<TInput, TOutput, TContext>>, order?: number): this;
    /**
     * use interceptor for this handler.
     * @param inteceptors 
     */
    use(inteceptors: ProvdierOf<InterceptorLike<TInput, TOutput, TContext>>[]): this;
    /**
     * use and append hanlder options.
     * @param options 
     */
    use(options: HandlerOptions<TInput, TOutput, TContext>): this;
}


/**
 * Configable handler
 */
@Abstract()
export abstract class AbstractConfigableHandler<
    TInput = any,
    TOutput = any,
    TContext extends RunContext = RunContext> implements Handler<TInput, TOutput, TContext> {

    abstract get context(): InvocationContext;

    /**
     * append handler options.
     * @param options 
     */
    abstract append(options: HandlerOptions<TInput, TOutput, TContext>): this;

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
 * hanlder control options
 */
export interface HandlerOptions<TInput = any, TOutput = any, TContext = any> {
    /**
     * An array of dependency-injection tokens used to look up `GuardLike()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<GuardLike<TInput>>[];
    /**
     * interceptors of handler.
     */
    interceptors?: ProvdierOf<InterceptorLike<TInput, TOutput, TContext>>[];
    /**
     * pipes for the handler.
     */
    pipes?: StaticProvider<PipeTransform>[];
    /**
     * filters of handler.
     */
    filters?: ProvdierOf<FilterLike<TInput, TOutput>>[];

    /**
     * backend handler.
     */
    backend?: ProvdierOf<HandlerLike<TInput, TOutput, TContext>>;

}

export function isHandlerOptions(target: any): target is HandlerOptions {
    return isPlainObject(target) && (
        'guards' in target || 'interceptors' in target || 'pipes' in target || 'filters' in target)
}

/**
 * Configable handler options.
 */
export interface ConfigableHandlerOptions<TInput = any, TOutput = any, TContext = any> extends HandlerOptions<TInput, TOutput, TContext>, InvokeProviders {
    /**
     * handler type.
     */
    handlerType?: Type<Handler>;
    /**
     * enable input type filters and interceptors chain for handler.
     */
    enableTypeChain?: boolean;
    /**
     * execption handlers
     */
    execptionHandlers?: Type<any> | Type[] | null;

    /**
     * interceptors token.
     */
    interceptorsToken?: Token<InterceptorLike<TInput, TOutput, TContext>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<GuardLike<TInput, TContext>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<FilterLike<TInput, TOutput, TContext>[]>;

    /**
     * backend handler token.
     */
    backendToken?: Token<HandlerLike<TInput, TOutput, TContext>[]>;

}

