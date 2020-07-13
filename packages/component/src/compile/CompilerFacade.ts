import { Abstract, IProviders, InjectorProvider } from '@tsdi/ioc';
import { IComponentMetadata, IDirectiveMetadata } from '../decorators/metadata';

/**
 * compiler identifiers providers.
 */
export class Identifiers extends InjectorProvider {

}

/**
 * ivy compiler.
 */
@Abstract()
export abstract class CompilerFacade {
    /**
     * compiler providers. the IInjector compiler registered in.
     */
    abstract getCompilerProviders(): IProviders;

    abstract compileTemplate(template: any): any;

    abstract compileComponent(meta: IComponentMetadata): any;

    abstract compileDirective(meta: IDirectiveMetadata): any;
}
