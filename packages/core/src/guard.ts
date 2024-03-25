import { ProvdierOf, Token, TypeOf, getTokenOf, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * Handler Guard.
 * 
 * 处理器守卫
 */
export interface CanActivate<T = any, TContext = any> {
    /**
     * handler guard. can invoke handler or not.
     * 
     * 处理器守卫, 验证可以调用处理器与否。
     * @param input input data.
     * @param context guard with context.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(input: T, context?: TContext): boolean | Promise<boolean> | Observable<boolean>;
}


/**
 *  guards multi token
 * 
 *  处理器守卫组的标记令牌
 */
export const GUARDS_TOKEN = tokenId<CanActivate[]>('GUARDS_TOKEN');


const GUARDS = 'GUARDS';
/**
 * get target guards token.
 * @param request 
 * @returns 
 */
export function getGuardsToken(type: TypeOf<any> | string, propertyKey?: string): Token<CanActivate[]> {
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
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;
}