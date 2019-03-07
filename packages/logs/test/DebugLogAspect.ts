import { IContainer, ContainerToken } from '@ts-ioc/core';
import { Aspect, Around, Joinpoint } from '@ts-ioc/aop';
import { LoggerAspect } from '../src';
import { Singleton, Inject } from '@ts-ioc/ioc';

@Singleton
@Aspect
export class DebugLogAspect extends LoggerAspect {

    constructor( @Inject(ContainerToken) container: IContainer) {
        super(container);
    }

    @Around('execution(*.*)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}
