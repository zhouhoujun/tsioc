import { Joinpoint, Around, Aspect, Before } from '../src';


@Aspect
export class IocDebug {
    @Around('execution(*)')
    log(joinPoint: Joinpoint) {
        console.log('aspect Around log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' args:', joinPoint.args, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }

    @Before('execution(*)')
    beforelog(joinPoint: Joinpoint) {
        console.log('aspect Before log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}
