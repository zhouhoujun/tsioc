import { Abstract } from '@tsdi/ioc';
import { IComponentMetadata, IDirectiveMetadata } from '../decorators/IComponentMetadata';

/**
 * ivy compiler.
 */
@Abstract()
export abstract class Compiler {

    abstract compileTemplate(template: any): any;

    abstract compile(template: any): any;

    abstract compileComponent(meta: IComponentMetadata): any;

    abstract compileDirective(meta: IDirectiveMetadata): any;

    abstract serialize(component: any): any;
}
