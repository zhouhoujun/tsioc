import { isClass, isBaseType, ITypeReflects, Type, IocCoreService, IocDestoryable } from '@tsdi/ioc';
import { NonePointcut } from '../decorators/NonePointcut';


/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
export function isValideAspectTarget(targetType: Type, reflects: ITypeReflects): boolean {
    if (!isClass(targetType) || isBaseType(targetType)) {
        return false;
    }
    if (reflects.hasMetadata(NonePointcut, targetType)) {
        return false;
    }
    if (reflects.isExtends(targetType, IocDestoryable)) {
        return false;
    }
    return !reflects.isExtends(targetType, IocCoreService);
}
