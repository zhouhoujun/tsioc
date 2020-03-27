import { IComponentContext } from './ComponentContext';

export interface IExpressionParser {
    parseBinding();
    parseTemplateBindings();
    parseInterpolation();
    parseChain();
    
}

