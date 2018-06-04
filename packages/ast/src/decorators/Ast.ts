import { isString, isRegExp, isArray, isNumber, createClassDecorator, ClassMetadata, MetadataExtends, MetadataAdapter, isClassMetadata, Registration, isClass, ITypeDecorator, Type, IClassDecorator } from '@ts-ioc/core';

export interface AstMetadata extends ClassMetadata {
    astType: string;
}

/**
 * Ast decorator, use to define class is a Ast element.
 *
 * @export
 * @interface IAstDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IAstDecorator<T extends AstMetadata> extends IClassDecorator<T> {

}

export function createAstDecorator<T extends AstMetadata>(
    AstType: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IAstDecorator<T> {

    return createClassDecorator<AstMetadata>('Ast', adapter,
        metadata => {
            if (metadataExtends) {
                metadata = metadataExtends(metadata as T);
            }

            metadata.astType = metadata.alias;

            return metadata;
        }) as IAstDecorator<T>;
}

/**
 * Ast decorator, use to define class is a Ast element.
 *
 * @Ast
 */
export const Ast: IAstDecorator<AstMetadata> = createAstDecorator('Ast');

