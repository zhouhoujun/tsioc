import { Aspect, Pointcut } from '@tsdi/aop';

export const AuthorizationPointcut = 'execution(AuthorizationAspect.authProcess)'

/**
 * Auth aspect pointcut. pointcut for method has @Authorization decorator, to dynamic check your custom auth validation.
 *
 * @export
 * @class AuthAspect
 */
@Aspect()
export class AuthorizationAspect {
    // pointcut for method has @Authorization decorator.
    @Pointcut('@annotation(Authorization)')
    authProcess() {
        // pointcut for custom auth.
    }

}
