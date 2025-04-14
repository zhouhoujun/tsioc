import { JoinPoint, Around, Aspect, Before, After, AdviceMetadata } from '../../src';



@Aspect()
export class ChangedAspect {
    // pointcut for method has @AutoWried decorator.
    @After('set(*.props.name)')
    change(joinPoint: JoinPoint) {
        if (joinPoint.state == 'After') {
            joinPoint.target.changed = joinPoint.valueChange;
        }
        console.log('aspect set After, property name:', joinPoint.fullName, ' state:', joinPoint.state, 'change:', joinPoint.valueChange, joinPoint.accessor);
    }

    @Around('value(*.personFullName)')
    nameChange(joinPoint: JoinPoint) {
        if (joinPoint.state == 'After') {
            joinPoint.target.fulChange = joinPoint.valueChange;
        }
        console.log('aspect value around, property name:', joinPoint.fullName, ' state:', joinPoint.state, 'change:', joinPoint.valueChange, joinPoint.accessor);
    }
}

