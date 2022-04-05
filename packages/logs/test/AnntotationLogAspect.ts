import { Singleton, MethodMetadata } from '@tsdi/ioc';
import { Aspect, Joinpoint, Pointcut } from '@tsdi/aop';
import { LogAspect } from '../src';

@Singleton()
@Aspect()
export class AnntotationLogAspect extends LogAspect {

    @Pointcut('@annotation(Logger)', { annotationArgName: 'logAnnotation', annotationName: '@Logger'} )
    logging(logAnnotation: MethodMetadata[], joinPoint: Joinpoint) {
        this.processLog(joinPoint, logAnnotation);
    }
}
