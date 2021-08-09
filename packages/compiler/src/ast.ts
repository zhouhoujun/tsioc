import { AST, BindingType, ParsedEventType } from './exp_parser/ast';
import { SecurityContext } from './parser';
import { ParseSourceSpan } from './util';

export interface Node {
    sourceSpan: ParseSourceSpan;
    visit<T>(visitor: Visitor<T>): T;
}


export class Comment implements Node {
    constructor(
        public value: string | null,
        public sourceSpan: ParseSourceSpan) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitComment(this);
    }
}

export class Attribute implements Node {
    constructor(
        public name: string,
        public value: string,
        public sourceSpan: ParseSourceSpan,
        readonly keySpan: ParseSourceSpan | undefined,
        public valueSpan?: ParseSourceSpan) {
    }
    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitAttribute(this);
    }
}


export class Text implements Node {
    constructor(public sourceSpan: ParseSourceSpan) { }
    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitText(this);
    }
}

export class BoundText implements Node {
    constructor(public value: AST, public sourceSpan: ParseSourceSpan) { }
    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitBoundText(this);
    }
}

/**
 * Represents a text attribute in the template.
 *
 * `valueSpan` may not be present in cases where there is no value `<div a></div>`.
 * `keySpan` may also not be present for synthetic attributes from ICU expansions.
 */
export class TextAttribute implements Node {
    constructor(
        public name: string, public value: string, public sourceSpan: ParseSourceSpan,
        readonly keySpan: ParseSourceSpan | undefined, public valueSpan?: ParseSourceSpan) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitTextAttribute(this);
    }
}


export class BoundAttribute implements Node {
    constructor(
        public name: string, public type: BindingType, public securityContext: SecurityContext,
        public value: AST, public unit: string | null, public sourceSpan: ParseSourceSpan,
        readonly keySpan: ParseSourceSpan, public valueSpan: ParseSourceSpan | undefined) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitBoundAttribute(this);
    }
}

export class BoundEvent implements Node {
    constructor(
        public name: string, public type: ParsedEventType, public handler: AST,
        public target: string | null, public phase: string | null, public sourceSpan: ParseSourceSpan,
        public handlerSpan: ParseSourceSpan, readonly keySpan: ParseSourceSpan) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitBoundEvent(this);
    }
}


export class Element implements Node {
    constructor(
        public name: string, public attributes: TextAttribute[], public inputs: BoundAttribute[],
        public outputs: BoundEvent[], public children: Node[], public references: Reference[],
        public sourceSpan: ParseSourceSpan, public startSourceSpan: ParseSourceSpan,
        public endSourceSpan: ParseSourceSpan | null) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitElement(this);
    }
}




export class Template implements Node {
    constructor(
        public tagName: string, public attributes: TextAttribute[], public inputs: BoundAttribute[],
        public outputs: BoundEvent[], public templateAttrs: (BoundAttribute | TextAttribute)[],
        public children: Node[], public references: Reference[], public variables: Variable[],
        public sourceSpan: ParseSourceSpan, public startSourceSpan: ParseSourceSpan,
        public endSourceSpan: ParseSourceSpan | null) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitTemplate(this);
    }
}


export class Content implements Node {
    readonly name = 'v-content';

    constructor(
        public selector: string, public attributes: TextAttribute[],
        public sourceSpan: ParseSourceSpan) { }
    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitContent(this);
    }
}

export class Variable implements Node {
    constructor(
        public name: string, public value: string, public sourceSpan: ParseSourceSpan,
        readonly keySpan: ParseSourceSpan, public valueSpan?: ParseSourceSpan) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitVariable(this);
    }
}

export class Reference implements Node {
    constructor(
        public name: string, public value: string, public sourceSpan: ParseSourceSpan,
        readonly keySpan: ParseSourceSpan, public valueSpan?: ParseSourceSpan) { }

    visit<T>(visitor: Visitor<T>): T {
        return visitor.visitReference(this);
    }
}




export interface Visitor<T = any> {
    // Returning a truthy value from `visit()` will prevent `visitAll()` from the call to the typed
    // method and result returned will become the result included in `visitAll()`s result array.
    visit?(node: Node): T;

    visitElement(element: Element): T;
    visitAttribute(attribute: Attribute): T;
    visitText(text: Text): T;
    visitComment(comment: Comment): T;


    visitBoundText(text: BoundText): T;
    visitTemplate(template: Template): T;
    visitTextAttribute(attribute: TextAttribute): T;
    visitBoundAttribute(attribute: BoundAttribute): T;
    visitBoundEvent(attribute: BoundEvent): T;
    visitContent(content: Content): T;
    visitVariable(variable: Variable): T;
    visitReference(reference: Reference): T;
}



export function visitAll(visitor: Visitor, nodes: Node[]): any[] {
    const result: any[] = [];

    const visit = visitor.visit ?
        (ast: Node) => visitor.visit!(ast) || ast.visit(visitor) :
        (ast: Node) => ast.visit(visitor);
    nodes.forEach(ast => {
        const astResult = visit(ast);
        if (astResult) {
            result.push(astResult);
        }
    });
    return result;
}
