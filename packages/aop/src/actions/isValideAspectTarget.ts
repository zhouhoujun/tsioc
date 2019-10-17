import { isClass, isBaseType, TypeReflects, Type, IocCoreService } from '@tsdi/ioc';
import { NonePointcut } from '../decorators';


/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
export function isValideAspectTarget(targetType: Type, reflects: TypeReflects): boolean {
    if (!isClass(targetType) || isBaseType(targetType)) {
        return false;
    }
    if (reflects.isExtends(targetType, IocCoreService)) {
        return false;
    }
    return !reflects.hasMetadata(NonePointcut, targetType);
}
