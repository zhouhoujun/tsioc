import { ClassMethodDecorator, createDecorator, Type, TypeMetadata } from '@tsdi/ioc';
import { CanActivate } from '../router/guard';
import { PipeTransform } from '../pipes/pipe';
import { Middleware, MiddlewareFn } from '../transport/endpoint';


/**
 * authorization metadata.
 */
export interface AuthorizationMetadata extends TypeMetadata {
    /**
     * role
     */
    role?: string;
    /**
     * middleware to auth.
     */
    middlewares?: (Type<Middleware>|MiddlewareFn)[];
    /**
     * pipes for the route.
     */
    pipes?: Type<PipeTransform>[];
    /**
     * route guards.
     */
    guards?: Type<CanActivate>[];
}



/**
 * Authorization decorator, define class or method need auth check.
 *
 * @Authorization
 */
export interface AuthorizationDecorator {
    /**
     * Authorization decorator, define class or method need auth check.
     *
     * @Authorization
     *
     * @param {string} [role] auth role.
     */
    (role?: string): ClassMethodDecorator;
    /**
     * Authorization decorator, define class or method need auth check.
     *
     * @Authorization
     *
     * @param {AuthorizationMetadata} [metadata] auth metadata.
     */
    (metadata: AuthorizationMetadata): ClassMethodDecorator;
}


/**
 * Authorization decorator, define class or method need auth check.
 *
 * @Authorization
 */
export const Authorization: AuthorizationDecorator = createDecorator<AuthorizationMetadata>('Authorization', {
    props: (role: string) => ({ role })
})
