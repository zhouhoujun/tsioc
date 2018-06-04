import { isString, isRegExp, isArray, isNumber, createClassDecorator, ClassMetadata, MetadataExtends, MetadataAdapter, isClassMetadata, Registration, isClass, ITypeDecorator, Type } from '@ts-ioc/core';

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
export interface IAstDecorator<T extends AstMetadata> extends ITypeDecorator<T> {
    /**
     * Ast decorator, use to define class as Ast element.
     *
     * @Ast
     *
     * @param {T} [AstName] Ast name.
     * @param {(Registration<any> | symbol | string)} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     */
    (metadata?: T): ClassDecorator;
    /**
     * Ast decorator, use to define class as Ast element.
     *
     * @Ast
     *
     * @param {string} [AstName] Ast name.
     */
    (AstName?: string): ClassDecorator;
    /**
     * Ast decorator, use to define class as Ast element.
     *
     * @Ast
     */
    (target: Function): void;
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

            metadata.astType = metadata.alias || 'AST';

            return metadata;
        }) as IAstDecorator<T>;
}

/**
 * Ast decorator, use to define class is a Ast element.
 *
 * @Ast
 */
export const Ast: IAstDecorator<AstMetadata> = createAstDecorator('Ast');

