import { Singleton, Inject, symbols, IContainer } from '@ts-ioc/core';
import { Aspect, Around, Joinpoint } from '@ts-ioc/aop';
import { LoggerAspect } from '../src';

@Singleton
@Aspect
export class DebugLogAspect extends LoggerAspect {

    constructor( @Inject(symbols.IContainer) container: IContainer) {
        super(container);
    }

    @Around('execution(*.*)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}
