import { MethodMetadata } from '@tsdi/ioc';
import { Aspect, JoinPoint, Pointcut } from '@tsdi/aop';
import { LogAspect } from '../src';


@Aspect({ static: true })
export class AnntotationLogAspect extends LogAspect {

    @Pointcut('@annotation(Logger)', { annotationArgName: 'logAnnotation', annotationName: '@Log'} )
    logging(logAnnotation: MethodMetadata[], joinPoint: JoinPoint) {
        this.processLog(joinPoint, logAnnotation);
    }
}
