import { Aspect, Around, Joinpoint } from '@tsdi/aop';
import { LogAspect } from '../src';

@Aspect({ static: true })
export class DebugLog1Aspect extends LogAspect {

    @Around('execution(*.*)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}
