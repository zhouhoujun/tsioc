import { Abstract } from '@tsdi/ioc';
import { ModuleConfigure } from './modules/ModuleConfigure';

/**
 * annotation cloner.
 *
 * @export
 * @abstract
 * @class AnnotationCloner
 * @template T
 */
@Abstract()
export abstract class AnnotationCloner<T extends ModuleConfigure = ModuleConfigure>  {
    abstract clone(annotation: T): T;
}
