import { Singleton, MethodMetadata } from '@ts-ioc/ioc';
import { Joinpoint, Around, Aspect, Before, After, AdviceMetadata } from '../../src';



@Aspect
export class CheckRightAspect {
    // pointcut for method has @Method decorator.
    @Before('execution(AnnotationAspect.auth)', 'authMetas')
    // @Around({ pointcut: 'run()', annotation: Before })
    beforelog(joinPoint: Joinpoint, authMetas: MethodMetadata[]) {
        console.log('authMetas:', authMetas);
        console.log('aspect execution Before AnnotationAspect.auth, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}
