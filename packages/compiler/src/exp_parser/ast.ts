/**
 * Records the absolute position of a text span in a source file, where `start` and `end` are the
 * starting and ending byte offsets, respectively, of the text span in a source file.
 */
export class AbsoluteSourceSpan {
    constructor(public readonly start: number, public readonly end: number) { }
}

export class ParseSpan {
    constructor(public start: number, public end: number) { }
    toAbsolute(absoluteOffset: number): AbsoluteSourceSpan {
        return new AbsoluteSourceSpan(absoluteOffset + this.start, absoluteOffset + this.end);
    }
}

export class AST {
    constructor(
        public span: ParseSpan,
        /**
         * Absolute location of the expression AST in a source code file.
         */
        public sourceSpan: AbsoluteSourceSpan) { }
    visit(visitor: AstVisitor, context: any = null): any {
        return null;
    }
    toString(): string {
        return 'AST';
    }
}

export const enum BindingType {
    // A regular binding to a property (e.g. `[property]="expression"`).
    Property,
    // A binding to an element attribute (e.g. `[attr.name]="expression"`).
    Attribute,
    // A binding to a CSS class (e.g. `[class.name]="condition"`).
    Class,
    // A binding to a style rule (e.g. `[style.rule]="expression"`).
    Style,
    // A binding to an animation reference (e.g. `[animate.key]="expression"`).
    Animation,
}

export const enum ParsedEventType {
    // DOM or Directive event
    Regular,
    // Animation specific event
    Animation,
  }
  

export interface AstVisitor {
    /**
     * This function is optionally defined to allow classes that implement this
     * interface to selectively decide if the specified `ast` should be visited.
     * @param ast node to visit
     * @param context context that gets passed to the node and all its children
     */
    visit?(ast: AST, context?: any): any;
}