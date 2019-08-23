import { ITypeDecorator, MetadataExtends, createClassDecorator, ArgsIteratorAction } from '@tsdi/ioc';
import { IAnnotationMetadata } from '../modules';


/**
 * annotation metadata.
 *
 * @export
 * @interface AnnotationMetadata
 * @extends {AnnotationConfigure}
 */
export interface AnnotationMetadata extends IAnnotationMetadata {

}

/**
 * Annotation decorator, use to define class build way via config.
 *
 * @export
 * @interface IAnnotationDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IAnnotationDecorator<T extends AnnotationMetadata> extends ITypeDecorator<T> {
    /**
     * Annotation decorator, use to define class as DI Module.
     *
     * @Build
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}

/**
 * create type builder decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction<T>[]} [actions]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IAnnotationDecorator<T>}
 */
export function createAnnotationDecorator<T extends AnnotationMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metadataExtends?: MetadataExtends<T>): IAnnotationDecorator<T> {

    return createClassDecorator<AnnotationMetadata>(name,
        actions,
        metadata => {
            if (metadataExtends) {
                metadataExtends(metadata as T);
            }
            return metadata;
        }) as IAnnotationDecorator<T>;
}


/**
 * Annotation decorator, use to define class build way via config.
 *
 * @Annotation
 */
export const Annotation: IAnnotationDecorator<AnnotationMetadata> = createAnnotationDecorator<AnnotationMetadata>('Annotation');
