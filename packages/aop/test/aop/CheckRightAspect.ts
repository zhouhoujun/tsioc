import { Singleton, MethodMetadata } from '@ts-ioc/core';
import { Joinpoint, Around, Aspect, Before, After} from '../../src';



@Aspect
export class CheckRightAspect {
    // pointcut for method has @Method decorator.
    @Before('execution(AnnotationAspect.auth)', 'authMetas')
    beforelog(joinPoint: Joinpoint, authMetas: MethodMetadata[]) {
        console.log('authMetas:', authMetas);
        console.log('aspect execution Before AnnotationAspect.auth, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}
