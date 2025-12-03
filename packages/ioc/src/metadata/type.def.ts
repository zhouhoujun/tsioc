import { AbstractType, AnnotationType } from '../types';
import { TypeDef } from './class';


const TYEP_DEF = Symbol('TYEP_DEF');
/**
 * get type def.
 * @param type class type.
 */
export function getDef<T extends TypeDef>(type: AbstractType): Partial<T> {
    let tagAnn = Reflect.getMetadata(TYEP_DEF, type) as Partial<T>;
    if (tagAnn?.type !== type) {
        tagAnn = (type as AnnotationType).ƿAnn?.() as Partial<T>;
        if (tagAnn?.type !== type) {
            tagAnn = {
                name: type.name,
                type
            } as Partial<T>;
            Reflect.defineMetadata(TYEP_DEF, tagAnn, type);
        }
    }
    return tagAnn as T
}