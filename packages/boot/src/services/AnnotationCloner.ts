import { Abstract, ClassMetadata } from '@tsdi/ioc';
/**
 * annotation cloner.
 *
 * @export
 * @abstract
 * @class AnnotationCloner
 * @template T
 */
@Abstract()
export abstract class AnnotationCloner<T extends ClassMetadata = ClassMetadata>  {
    abstract clone(annotation: T): T;
}
