import { Type, isClass, isBaseType, lang, IocCoreService, IIocContainer } from '@tsdi/ioc';


/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
export function isValideAspectTarget(targetType: Type, container?: IIocContainer): boolean {
    if (!isClass(targetType) || isBaseType(targetType)) {
        return false;
    }
    if (container ? container.isExtends(targetType, IocCoreService) : lang.isExtendsClass(targetType, IocCoreService)) {
        return false;
    }
    return true;
}
