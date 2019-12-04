import { IModuleReflect } from './IModuleReflect';
import { IModuleResolver } from './IModuleResovler';

/**
 * di module reflect info.
 *
 * @export
 * @interface IDIModuleReflect
 * @extends {ITypeReflect}
 */
export interface IDIModuleReflect extends IModuleReflect {
    /**
     * module resolver of DIModule
     *
     * @type {IModuleResolver}
     * @memberof IDIModuleReflect
     */
    moduleResolver?: IModuleResolver;
}
