import { Abstract } from '@tsdi/ioc';

/**
 * ivy compiler.
 */
@Abstract()
export abstract class Compiler {

    abstract compileComponent(): any;

    abstract compileDirective(): any;
}
