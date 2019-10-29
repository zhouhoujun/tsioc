import { Singleton, Inject, MethodMetadata } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { Aspect, Around, Joinpoint, Pointcut } from '@tsdi/aop';
import { LoggerAspect } from '../src';

@Singleton
@Aspect
export class AnntotationLogAspect extends LoggerAspect {

    @Pointcut('@annotation(Logger)', 'logAnnotation')
    logging(logAnnotation: MethodMetadata[], joinPoint: Joinpoint) {
        console.log('-----------------------------------\nAnntotationLogAspect:', logAnnotation);
        this.processLog(joinPoint, logAnnotation);
    }
}
