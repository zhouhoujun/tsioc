import {
    Type, hasOwnClassMetadata, isClass, isObject,
    DefaultLifeScope, CacheManager, ActionFactory,
    MethodAccessor, ProviderMatcher, Provider, CustomProvider, InvokeProvider, ParamProvider, ExtendsProvider, AsyncParamProvider, ProviderMap
} from '@ts-ioc/core';
import { NonePointcut } from './decorators/index';

export function isValideAspectTarget(targetType: Type<any>) {

    if (!isClass(targetType)
        || targetType === Object
        || targetType === String
        || targetType === Date) {
        return false;
    }


    if (hasOwnClassMetadata(NonePointcut, targetType)) {
        return false;
    }

    if (targetType === ActionFactory
        || targetType === CacheManager
        || targetType === DefaultLifeScope
        || targetType === MethodAccessor
        || targetType === ProviderMatcher
        || targetType === Provider
        || targetType === CustomProvider
        || targetType === InvokeProvider
        || targetType === ParamProvider
        || targetType === ExtendsProvider
        || targetType === AsyncParamProvider
        || targetType === ProviderMap) {
        return false;
    }

    return true;
}
