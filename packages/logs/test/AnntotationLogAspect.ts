import { Singleton, Inject, MethodMetadata } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint, Pointcut } from '@tsdi/aop';
import { LoggerAspect } from '../src';
import { ContainerToken, IContainer } from '@tsdi/core';

@Singleton
@Aspect
export class AnntotationLogAspect extends LoggerAspect {

    @Pointcut('@annotation(Logger)', 'logAnnotation')
    logging(logAnnotation: MethodMetadata[], joinPoint: Joinpoint) {
        console.log('-----------------------------------\nAnntotationLogAspect:', logAnnotation);
        this.processLog(joinPoint, logAnnotation);
    }
}
