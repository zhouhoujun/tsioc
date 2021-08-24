/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { AST, BindingType, BoundElementProperty, ParsedEvent, ParsedEventType } from './exp_parser/ast';
import { ParseSourceSpan, SecurityContext } from './util';

export interface Node {
    sourceSpan: ParseSourceSpan;
    visit<T>(visitor: Visitor<T>): T;
}

export class Comment implements Node {
    constructor(public value: string, public sourceSpan: ParseSourceSpan) { }

    visit<T>(visitor: Visitor<T>): T {
        throw new Error('visit() not implemented for Comment');
    }
}


export class Text implements Node {
    constructor(public value: string, public sourceSpan: ParseSourceSpan) { }
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

    static fromBoundElementProperty(prop: BoundElementProperty): BoundAttribute {
        if (prop.keySpan === undefined) {
          throw new Error(
              `Unexpected state: keySpan must be defined for bound attributes but was not for ${
                  prop.name}: ${prop.sourceSpan}`);
        }
        return new BoundAttribute(
            prop.name, prop.type, prop.securityContext, prop.value, prop.unit, prop.sourceSpan,
            prop.keySpan, prop.valueSpan);
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

    static fromParsedEvent(event: ParsedEvent) {
        const target: string|null = event.type === ParsedEventType.Regular ? event.targetOrPhase : null;
        const phase: string|null =
            event.type === ParsedEventType.Animation ? event.targetOrPhase : null;
        if (event.keySpan === undefined) {
          throw new Error(`Unexpected state: keySpan must be defined for bound event but was not for ${
              event.name}: ${event.sourceSpan}`);
        }
        return new BoundEvent(
            event.name, event.type, event.handler, target, phase, event.sourceSpan, event.handlerSpan,
            event.keySpan);
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
    visitTemplate(template: Template): T;
    visitTextAttribute(attribute: TextAttribute): T;
    visitBoundAttribute(attribute: BoundAttribute): T;
    visitBoundEvent(attribute: BoundEvent): T;
    visitContent(content: Content): T;
    visitVariable(variable: Variable): T;
    visitReference(reference: Reference): T;
    visitText(text: Text): T;
    visitBoundText(text: BoundText): T;
}


export class NullVisitor implements Visitor<void> {
    visitElement(element: Element): void { }
    visitTemplate(template: Template): void { }
    visitContent(content: Content): void { }
    visitVariable(variable: Variable): void { }
    visitReference(reference: Reference): void { }
    visitTextAttribute(attribute: TextAttribute): void { }
    visitBoundAttribute(attribute: BoundAttribute): void { }
    visitBoundEvent(attribute: BoundEvent): void { }
    visitText(text: Text): void { }
    visitBoundText(text: BoundText): void { }
}

export class RecursiveVisitor implements Visitor<void> {
    visitElement(element: Element): void {
        visitAll(this, element.attributes);
        visitAll(this, element.children);
        visitAll(this, element.references);
    }
    visitTemplate(template: Template): void {
        visitAll(this, template.attributes);
        visitAll(this, template.children);
        visitAll(this, template.references);
        visitAll(this, template.variables);
    }
    visitContent(content: Content): void { }
    visitVariable(variable: Variable): void { }
    visitReference(reference: Reference): void { }
    visitTextAttribute(attribute: TextAttribute): void { }
    visitBoundAttribute(attribute: BoundAttribute): void { }
    visitBoundEvent(attribute: BoundEvent): void { }
    visitText(text: Text): void { }
    visitBoundText(text: BoundText): void { }
}

export class TransformVisitor implements Visitor<Node> {
    visitElement(element: Element): Node {
        const newAttributes = transformAll(this, element.attributes);
        const newInputs = transformAll(this, element.inputs);
        const newOutputs = transformAll(this, element.outputs);
        const newChildren = transformAll(this, element.children);
        const newReferences = transformAll(this, element.references);
        if (newAttributes != element.attributes || newInputs != element.inputs ||
            newOutputs != element.outputs || newChildren != element.children ||
            newReferences != element.references) {
            return new Element(
                element.name, newAttributes, newInputs, newOutputs, newChildren, newReferences,
                element.sourceSpan, element.startSourceSpan, element.endSourceSpan);
        }
        return element;
    }

    visitTemplate(template: Template): Node {
        const newAttributes = transformAll(this, template.attributes);
        const newInputs = transformAll(this, template.inputs);
        const newOutputs = transformAll(this, template.outputs);
        const newTemplateAttrs = transformAll(this, template.templateAttrs);
        const newChildren = transformAll(this, template.children);
        const newReferences = transformAll(this, template.references);
        const newVariables = transformAll(this, template.variables);
        if (newAttributes != template.attributes || newInputs != template.inputs ||
            newOutputs != template.outputs || newTemplateAttrs != template.templateAttrs ||
            newChildren != template.children || newReferences != template.references ||
            newVariables != template.variables) {
            return new Template(
                template.tagName, newAttributes, newInputs, newOutputs, newTemplateAttrs, newChildren,
                newReferences, newVariables, template.sourceSpan, template.startSourceSpan,
                template.endSourceSpan);
        }
        return template;
    }

    visitContent(content: Content): Node {
        return content;
    }

    visitVariable(variable: Variable): Node {
        return variable;
    }
    visitReference(reference: Reference): Node {
        return reference;
    }
    visitTextAttribute(attribute: TextAttribute): Node {
        return attribute;
    }
    visitBoundAttribute(attribute: BoundAttribute): Node {
        return attribute;
    }
    visitBoundEvent(attribute: BoundEvent): Node {
        return attribute;
    }
    visitText(text: Text): Node {
        return text;
    }
    visitBoundText(text: BoundText): Node {
        return text;
    }
}

export function visitAll<T>(visitor: Visitor<T>, nodes: Node[]): T[] {
    const result: T[] = [];
    if (visitor.visit) {
        for (const node of nodes) {
            visitor.visit(node) || node.visit(visitor);
        }
    } else {
        for (const node of nodes) {
            const newNode = node.visit(visitor);
            if (newNode) {
                result.push(newNode);
            }
        }
    }
    return result;
}

export function transformAll<T extends Node>(
    visitor: Visitor<Node>, nodes: T[]): T[] {
    const result: T[] = [];
    let changed = false;
    for (const node of nodes) {
        const newNode = node.visit(visitor);
        if (newNode) {
            result.push(newNode as T);
        }
        changed = changed || newNode != node;
    }
    return changed ? result : nodes;
}
