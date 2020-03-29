import { IComponentContext } from '../ComponentContext';

export interface IExpressionParser {
    parseBinding();
    parseTemplateBindings();
    parseInterpolation();
    parseChain();
}

export abstract class Compiler {

    abstract compileComponent(): any;

    abstract compileDirective(): any;

}



