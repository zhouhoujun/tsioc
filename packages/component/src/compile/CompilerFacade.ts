import { Abstract, IProviders, InjectorProvider } from '@tsdi/ioc';
import { ComponentMetadata, DirectiveMetadata } from '../metadata';

/**
 * compiler identifiers providers.
 */
export class Identifiers extends InjectorProvider {

}

/**
 * compiler facade.
 */
@Abstract()
export abstract class CompilerFacade {
    /**
     * compiler providers. the IInjector compiler registered in.
     */
    abstract getCompilerProviders(): IProviders;

    abstract compileTemplate(template: any): any;

    abstract compileComponent(meta: ComponentMetadata): any;

    abstract compileDirective(meta: DirectiveMetadata): any;
}
