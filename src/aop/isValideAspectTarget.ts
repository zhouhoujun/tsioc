import { Aspect } from './decorators/index';
import { Type } from '../Type';
import { AspectSet } from './AspectSet';
import { AdviceMatcher } from './AdviceMatcher';
import { MethodAccessor } from '../core/index';
import { ContainerBuilder } from '../ContainerBuilder';
import { NodeModuleLoader } from '../NodeModuleLoader';
import { BrowserModuleLoader } from '../BrowserModuleLoader';


export function isValideAspectTarget(targetType: Type<any>) {

    if (Reflect.hasMetadata(Aspect.toString(), targetType)) {
        return false;
    }
    if (targetType === AspectSet) {
        return false;
    }

    if (targetType === AdviceMatcher) {
        return false;
    }

    if (targetType === MethodAccessor) {
        return false;
    }

    if (targetType === ContainerBuilder) {
        return false;
    }

    if (targetType === BrowserModuleLoader) {
        return false;
    }

    if (targetType === NodeModuleLoader) {
        return false;
    }

    return true;
}
