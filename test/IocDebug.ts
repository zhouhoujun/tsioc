import { Joinpoint, Around, Aspect } from '../src';


@Aspect
export class IocDebug {
    @Around('execution(*)')
    log(joinPoint: Joinpoint) {
        console.log('aspect append log, method name:', joinPoint.fullName,  ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}
