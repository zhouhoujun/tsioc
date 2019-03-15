import { ITypeDecorator, ClassMetadata, createClassDecorator, ProvideToken, Token } from '@ts-ioc/ioc';

/**
 * RootModule decorator.
 *
 * @export
 * @interface IRootOnlyDecorator
 * @extends {ITypeDecorator<ClassMetadata>}
 */
export interface IRootModuleDecorator extends ITypeDecorator<ClassMetadata> {
    /**
     * RootModule decorator, for class. use to define the class as root module for root conatiner only.
     *
     * @RootModule
     *
     * @param {ProvideToken<any>} provide define this class provider for provide.
     */
    (provide: ProvideToken<any>): ClassDecorator;

    /**
     * RootModule decorator, for class. use to define the class as root module for root conatiner only.
     *
     * @RootModule
     *
     * @param {Token<any>} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     */
    (provide: Token<any>, alias: string): ClassDecorator;

    /**
     * RootModule decorator, for class. use to define the class as root module for root conatiner only.
     *
     * @RootModule
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;
}

/**
 * RootModule decorator, for class. use to define the class as root module for root conatiner only.
 *
 * @RootModule
 */
export const RootModule: IRootModuleDecorator = createClassDecorator<ClassMetadata>('RootModule') as IRootModuleDecorator;

