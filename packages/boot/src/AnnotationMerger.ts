import { Abstract } from '@tsdi/ioc';
import { ModuleConfigure } from './modules/ModuleConfigure';

/**
 * annotation merger.
 *
 * @export
 * @abstract
 * @class AnnotationMerger
 * @template T
 */
@Abstract()
export abstract class AnnotationMerger<T extends ModuleConfigure = ModuleConfigure> {
    abstract merge(configs: T[]): T;
}
