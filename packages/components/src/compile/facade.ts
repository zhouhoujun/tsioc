import { Abstract, IProvider, ContextProvider } from '@tsdi/ioc';
import { ComponentReflect, DirectiveReflect } from '../reflect';

/**
 * compiler identifiers providers.
 */
export class Identifiers extends ContextProvider { }

/**
 * compiler facade.
 */
@Abstract()
export abstract class CompilerFacade {
    /**
     * compiler providers. the IInjector compiler registered in.
     */
    abstract getCompilerProviders(): IProvider;

    abstract compileTemplate(template: any): any;

    abstract compileComponent(meta: ComponentReflect): any;

    abstract compileDirective(meta: DirectiveReflect): any;
}
