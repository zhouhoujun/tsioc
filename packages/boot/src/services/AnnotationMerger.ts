import { Abstract, ClassMetadata } from '@tsdi/ioc';

/**
 * annotation merger.
 *
 * @export
 * @abstract
 * @class AnnotationMerger
 * @template T
 */
@Abstract()
export abstract class AnnotationMerger<T extends ClassMetadata = ClassMetadata> {
    abstract merge(configs: T[]): T;
}
