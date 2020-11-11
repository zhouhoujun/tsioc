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
    /**
     * compiler template.
     * @param template
     */
    abstract compileTemplate(template: any): any;
    /**
     * compile component.
     * @param meta
     */
    abstract compileComponent(meta: ComponentReflect): any;
    /**
     * compile directive.
     * @param meta
     */
    abstract compileDirective(meta: DirectiveReflect): any;
}
