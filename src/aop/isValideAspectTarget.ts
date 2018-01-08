import { Aspect } from './decorators/index';
import { Type } from '../Type';
import { AspectSet } from './AspectSet';
import { AdviceMatcher } from './AdviceMatcher';
import { MethodAccessor, ProviderMatcher, NonePointcut } from '../core/index';

export function isValideAspectTarget(targetType: Type<any>) {

    if (Reflect.hasMetadata(Aspect.toString(), targetType) || Reflect.hasMetadata(NonePointcut.toString(), targetType)) {
        return false;
    }
    return true;
}
