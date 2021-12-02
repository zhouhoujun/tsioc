import { Singleton, MethodMetadata } from '@tsdi/ioc';
import { Joinpoint, Around, Aspect, Before, After, AdviceMetadata } from '../../src';



@Aspect()
export class CheckRightAspect {
    // pointcut for method has @AutoWried decorator.
    @Before('execution(AnnotationAspect.auth)', 'allMetadata')
    // @Around({ pointcut: 'run()', annotation: Before })
    beforelog(joinPoint: Joinpoint, allMetadata: MethodMetadata[]) {
        console.log('allMetadata:', allMetadata);
        console.log('aspect execution Before AnnotationAspect.auth, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}
