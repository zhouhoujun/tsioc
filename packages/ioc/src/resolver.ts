import { Type, TypeOf } from './types';
import { Token } from './tokens';
import { ParameterMetadata } from './metadata/meta';
import { InvocationContext } from './context';
import { isDefined } from './utils/chk';
import { Invocation } from './invocation';

/**
 * parameter argument of an {@link OperationArgumentResolver}.
 * 
 * 调用参数。
 */
export interface Parameter<T = any> extends ParameterMetadata {
    /**
     * type.
     */
    type?: Type<T>;
    /**
     * provider type
     */
    provider?: Token<T>;
}

/**
 * Resolver for an argument of an {@link Invocation}.
 * 
 * 调用参数解析器。
 */
export interface OperationArgumentResolver<TParameter extends Parameter = Parameter, TCtx extends InvocationContext = InvocationContext> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param args gave arguments
     */
    canResolve(parameter: TParameter, ctx: TCtx): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    resolve<T>(parameter: TParameter, ctx: TCtx, target?: Type): T | null;
}

/**
 * argument resolver type.
 * 
 * 参数解析器的类或参数解析器实例。
 */
export type ArgumentResolver = TypeOf<OperationArgumentResolver>;

/**
 * compose resolver for an argument of an {@link Invocation}.
 * 
 * 组合合并参数解析器
 * 
 * @param filter compose canResolver filter.
 * @param resolvers resolves of the group.
 * @returns 
 */
export function composeResolver<TCtx extends InvocationContext = InvocationContext, TParameter extends Parameter = Parameter>(
    filter: (parameter: TParameter, ctx: TCtx) => boolean, ...resolvers: OperationArgumentResolver<TParameter, TCtx>[]): OperationArgumentResolver {
    return composeResolvers(resolvers, filter)
}

export function composeResolvers<TCtx extends InvocationContext = InvocationContext, TParameter extends Parameter = Parameter>(
    resolvers: OperationArgumentResolver<TParameter, TCtx>[], filter?: (parameter: TParameter, ctx: TCtx) => boolean): OperationArgumentResolver {
    if (resolvers.length === 1) return resolvers[0];
    return {
        canResolve: (parameter: TParameter, ctx: TCtx) => filter ? filter(parameter, ctx) : resolvers.some(r => r.canResolve(parameter, ctx)),
        resolve: <T>(parameter: TParameter, ctx: TCtx) => {
            let result: T | null = null;
            resolvers.some(r => {
                if (r.canResolve(parameter, ctx)) {
                    result = r.resolve(parameter, ctx);
                    return isDefined(result)
                }
                return false
            });
            return result
        }
    }
}

