import { Joinpoint, Pointcut, Around, Aspect, Before, Singleton } from '../../src';


@Aspect
export class AnnotationAspect {
    // pointcut for method has @Method decorator.
    @Pointcut('@annotation(Method)')
    auth(joinPoint: Joinpoint) {
        console.log('aspect annotation Before log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }

}
