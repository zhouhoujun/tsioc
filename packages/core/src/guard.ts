import { ProvdierOf, Token, TypeOf, getTokenOf, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * Handler Guard.
 * 
 * 处理器守卫
 */
export interface CanActivate<T = any> {
    /**
     * handler guard. can invoke handler or not.
     * 
     * 处理器守卫, 验证可以调用处理器与否。
     * @param input input data.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(input: T): boolean | Promise<boolean> | Observable<boolean>;
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
 */
export interface GuardsService {
    /**
     * use guards.
     * @param guards
     * @param order 
     */
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;
}