import { ClassMethodDecorator, createDecorator, Type, TypeMetadata } from '@tsdi/ioc';
import { CanActive } from '../middlewares/guard';
import { MiddlewareType } from '../middlewares/middleware';
import { PipeTransform } from '../pipes/pipe';


/**
 * authorization metadata.
 */
export interface AuthorizationMetadata extends TypeMetadata {
    /**
     * role
     *
     * @type {string}
     * @memberof AuthorizationMetadata
     */
    role?: string;
    /**
     * middleware to auth.
     *
     * @type {MiddlewareType[]}
     * @memberof AuthorizationMetadata
     */
    middlewares?: MiddlewareType[];
    /**
     * pipes for the route.
     */
    pipes?: Type<PipeTransform>[];
    /**
     * route guards.
     */
    guards?: Type<CanActive>[];
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
});
