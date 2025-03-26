import { Around, JoinPoint } from '@tsdi/aop';
import { ChangeDetector } from '../binding/change-detection';

export function Bindable() {
  return function (target: any, key: string) {
    // Around(`accessor:${key}`)
    //   .call((joinPoint: JoinPoint) => {
    //     const oldVal = joinPoint.target[key];
    //     const result = joinPoint.proceed();
    //     if (oldVal !== result) {
    //       const detector = joinPoint.injector.get(ChangeDetector);
    //       detector.markDirty(joinPoint.target);
    //     }
    //     return result;
    //   })(target, key);
  };
}
