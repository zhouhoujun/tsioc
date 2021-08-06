import { ParseSourceSpan } from '../util';

export interface Node {
    sourceSpan: ParseSourceSpan;
    visit(visitor: Visitor, context: any): any;
}

export type NodeType = Attribute | Comment | Element | Expansion | ExpansionCase | Text;

export class Attribute implements Node {
    constructor(
        public name: string,
        public value: string,
        public sourceSpan: ParseSourceSpan,
        readonly keySpan: ParseSourceSpan | undefined,
        public valueSpan?: ParseSourceSpan) {
    }
    visit(visitor: Visitor, context: any): any {
        return visitor.visitAttribute(this, context);
    }
}

export class Element implements Node {
    constructor(
        public name: string,
        public attrs: Attribute[],
        public children: Node[],
        public sourceSpan: ParseSourceSpan,
        public startSourceSpan: ParseSourceSpan,
        public endSourceSpan: ParseSourceSpan | null = null) { }

    visit(visitor: Visitor, context: any): any {
        return visitor.visitElement(this, context);
    }
}

export class Comment implements Node {
    constructor(
        public value: string | null,
        public sourceSpan: ParseSourceSpan) { }

    visit(visitor: Visitor, context: any): any {
        return visitor.visitComment(this, context);
    }
}

export class Text implements Node {
    constructor(public sourceSpan: ParseSourceSpan) { }
    visit(visitor: Visitor, context: any): any {
        return visitor.visitText(this, context);
    }
}


export class Expansion implements Node {
    constructor(
        public switchValue: string,
        public type: string,
        public cases: ExpansionCase[],
        public sourceSpan: ParseSourceSpan,
        public switchValueSourceSpan: ParseSourceSpan) {

    }
    visit(visitor: Visitor, context: any): any {
        return visitor.visitExpansion(this, context);
    }
}
export class ExpansionCase implements Node {
    constructor(
        public value: string,
        public expression: Node[],
        public sourceSpan: ParseSourceSpan,
        public valueSourceSpan: ParseSourceSpan,
        public expSourceSpan: ParseSourceSpan) { }

    visit(visitor: Visitor, context: any): any {
        return visitor.visitExpansionCase(this, context);
    }
}



export interface Visitor {
    // Returning a truthy value from `visit()` will prevent `visitAll()` from the call to the typed
    // method and result returned will become the result included in `visitAll()`s result array.
    visit?(node: NodeType, context: any): any;

    visitElement(element: Element, context: any): any;
    visitAttribute(attribute: Attribute, context: any): any;
    visitText(text: Text, context: any): any;
    visitComment(comment: Comment, context: any): any;
    visitExpansion(expansion: Expansion, context: any): any;
    visitExpansionCase(expansionCase: ExpansionCase, context: any): any;
}



export class RecursiveVisitor implements Visitor {

    visitElement(ast: Element, context: any): any {
        this.visitChildren(context, visit => {
            visit(ast.attrs);
            visit(ast.children);
        });
    }

    visitAttribute(ast: Attribute, context: any): any { }
    visitText(ast: Text, context: any): any { }
    visitComment(ast: Comment, context: any): any { }

    visitExpansion(ast: Expansion, context: any): any {
        return this.visitChildren(context, visit => {
            visit(ast.cases);
        });
    }

    visitExpansionCase(ast: ExpansionCase, context: any): any { }

    private visitChildren<T extends Node>(
        context: any, cb: (visit: (<V extends Node>(children: V[] | undefined) => void)) => void) {
        let results: any[][] = [];
        let t = this;
        function visit<T extends Node>(children: T[] | undefined) {
            if (children) results.push(visitAll(t, children, context));
        }
        cb(visit);
        return Array.prototype.concat.apply([], results);
    }
}

export function visitAll(visitor: Visitor, nodes: Node[], context: any = null): any[] {
    const result: any[] = [];

    const visit = visitor.visit ?
        (ast: Node) => visitor.visit!(ast, context) || ast.visit(visitor, context) :
        (ast: Node) => ast.visit(visitor, context);
    nodes.forEach(ast => {
        const astResult = visit(ast);
        if (astResult) {
            result.push(astResult);
        }
    });
    return result;
}
