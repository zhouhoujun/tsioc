import { ParseSourceSpan } from '../util';

export interface Node {
    sourceSpan: ParseSourceSpan;
    visit(visitor: Visitor, context: any): any;
}

export class Text implements Node {
    constructor(public sourceSpan: ParseSourceSpan) { }
    visit(visitor: Visitor, context: any): any {
        return visitor.visitText(this, context);
    }
}

export interface Visitor {
    // Returning a truthy value from `visit()` will prevent `visitAll()` from the call to the typed
    // method and result returned will become the result included in `visitAll()`s result array.
    visit?(node: Node, context: any): any;

    visitElement(element: Element, context: any): any;
    visitAttribute(attribute: Attribute, context: any): any;
    visitText(text: Text, context: any): any;
    visitComment(comment: Comment, context: any): any;
    visitExpansion(expansion: Expansion, context: any): any;
    visitExpansionCase(expansionCase: ExpansionCase, context: any): any;
}
