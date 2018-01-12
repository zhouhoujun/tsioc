import { Joinpoint, Around, Aspect, Before, Singleton } from '../../src';


@Aspect
export class CheckRightAspect {
    // pointcut for method has @Method decorator.
    @Before('execution(AnnotationAspect.auth)')
    beforelog(joinPoint: Joinpoint) {
        console.log('aspect execution Before AnnotationAspect.auth, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }

}
