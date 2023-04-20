import { ClassType, TypeOf } from './types';
import { Token, tokenId } from './tokens';
import { ParameterMetadata } from './metadata/meta';
import { InvocationContext } from './context';
import { isDefined } from './utils/chk';
import { OperationInvoker } from './operation';

/**
 * parameter argument of an {@link OperationArgumentResolver}.
 * 
 * 调用参数。
 */
export interface Parameter<T = any> extends ParameterMetadata {
    /**
     * type.
     */
    type?: ClassType<T>;
    /**
     * provider type
     */
    provider?: Token<T>;
    /**
     * multi provider or not.
     */
    multi?: boolean;
}

/**
 * Resolver for an argument of an `{@link OperationInvoker}`.
 * 
 * 调用参数解析器。
 */
export interface OperationArgumentResolver<C = any> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param args gave arguments
     */
    canResolve(parameter: Parameter, ctx: InvocationContext<C>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<C>, target?: ClassType): T;
}

/**
 * argument resolver type.
 * 
 * 参数解析器的类或参数解析器实例。
 */
export type ArgumentResolver = TypeOf<OperationArgumentResolver>;

/**
 * compose resolver for an argument of an {@link OperationInvoker}.
 * 
 * 组合合并参数解析器
 * 
 * @param filter compose canResolver filter.
 * @param resolvers resolves of the group.
 * @returns 
 */
export function composeResolver<T extends OperationArgumentResolver<any>, TP extends Parameter = Parameter, TCtx extends InvocationContext = InvocationContext>(
    filter: (parameter: TP, ctx: TCtx) => boolean, ...resolvers: T[]): OperationArgumentResolver {
    return {
        canResolve: (parameter: TP, ctx: TCtx) => filter(parameter, ctx),
        resolve: (parameter: TP, ctx: TCtx) => {
            let result: any;
            resolvers.some(r => {
                if (r.canResolve(parameter, ctx)) {
                    result = r.resolve(parameter, ctx);
                    return isDefined(result)
                }
                return false
            });
            return result ?? null
        }
    }
}

/**
 * context resolvers {@link OperationArgumentResolver} multi tokens. 
 * 
 * 调用参数解析器集合标记指令。
 */
export const CONTEXT_RESOLVERS = tokenId<OperationArgumentResolver[]>('CONTEXT_RESOLVERS');
