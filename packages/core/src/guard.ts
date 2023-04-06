import { ProvdierOf, Token, TypeOf, getTokenOf, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * Guard.
 */
export interface CanActivate<T = any> {
    /**
     * route guard.
     * @param input context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(input: T): boolean | Promise<boolean> | Observable<boolean>;
}


/**
 * mutil guards token
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