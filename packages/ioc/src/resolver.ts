import { ParameterMetadata } from './metadata/meta';
import { InvocationContext } from './context';
import { InterceptorLike } from './handler';

/**
 * parameter argument of an {@link OperationArgumentResolver}.
 * 
 * 调用参数。
 */
export interface Parameter<T = any> extends ParameterMetadata<T> {

}


export type ResolveInterceptorLike<TInput extends Parameter = Parameter, TContext extends InvocationContext = InvocationContext> = InterceptorLike<TInput, any, TContext>;
