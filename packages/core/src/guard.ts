import { ProvdierOf, Token, TypeOf, getTokenOf, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * Handler Guard.
 * 
 * 处理器守卫
 */
export interface CanHandle<T = any, TContext = any> {
    /**
     * handler guard. can invoke handler or not.
     * 
     * 处理器守卫, 验证可以调用处理器与否。
     * @param input input data.
     * @param context guard with context.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canHandle(input: T, context?: TContext): boolean | Promise<boolean> | Observable<boolean>;
}

/**
 * hander guard fn.
 */
export type CanHandleFn<T = any, TContext = any> = (input: T, context?: TContext) => boolean | Promise<boolean> | Observable<boolean>;

/**
 * Handler Guard.
 * 
 * 处理器守卫
 */
export type GuardLike<T = any, TContext = any> = CanHandle<T, TContext> | CanHandleFn<T, TContext>;

/**
 *  guards multi token
 * 
 *  处理器守卫组的标记令牌
 */
export const GUARDS_TOKEN = tokenId<CanHandle[]>('GUARDS_TOKEN');


const GUARDS = 'GUARDS';
/**
 * get target guards token.
 * @param request 
 * @returns 
 */
export function getGuardsToken(type: TypeOf<any> | string, propertyKey?: string): Token<CanHandle[]> {
    return getTokenOf(type, GUARDS, propertyKey)
}


/**
 * guards service.
 * 
 * 守卫服务
 */
export interface GuardsService {
    /**
     * use guards.
     * @param guards
     * @param order 
     */
    useGuards(guards: ProvdierOf<GuardLike> | ProvdierOf<GuardLike>[], order?: number): this;
}