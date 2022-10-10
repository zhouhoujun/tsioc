import { Abstract } from '@tsdi/ioc';
import { ComponentDef, DirectiveDef } from '../type';


/**
 * compiler identifiers providers.
 */

@Abstract()
export abstract class Identifiers {
    [k: string]: Function;
}

/**
 * compiler facade.
 */
@Abstract()
export abstract class CompilerFacade {
    /**
     * compiler providers. the IInjector compiler registered in.
     */
    abstract getIdentifiers(): Identifiers;
    /**
     * compiler template.
     * @param template
     */
    abstract compileTemplate(template: any): any;
    /**
     * compile component.
     * @param meta
     */
    abstract compileComponent(meta: ComponentDef): any;
    /**
     * compile directive.
     * @param meta
     */
    abstract compileDirective(meta: DirectiveDef): any;
}
