import { Abstract } from '@tsdi/ioc';
import { ComponentMetadataFacade, DirectiveMetadataFacade } from './interface';

/**
 * ivy compiler.
 */
@Abstract()
export abstract class CompilerFacade {

    abstract compileTemplate(template: any): any;

    abstract compileComponent(meta: ComponentMetadataFacade): any;

    abstract compileDirective(meta: DirectiveMetadataFacade): any;

    abstract serialize(component: any): any;
}
