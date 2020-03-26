/**
 * source range.
 */
export interface SourceRange {
    readonly start: number;
    readonly end: number;
}

/**
 * expression position.
 */
export class Position {
    constructor(public start: number, public end: number) {

    }

    offset(offset: number): SourceRange {
        const start = offset + this.start;
        const end = offset + this.end;
        return { start, end };
    }
}

/**
 * AST base.
 */
export class Ast {
    constructor(public exp: Position, public srcRange: Readonly<SourceRange>) {

    }

}

/**
 * ast source.
 */
export class AstSource extends Ast {
    constructor(public ast: Ast, public source: string, offset: number) {
        super(
            new Position(0, source ? source.length : 0),
            { start: offset, end: source ? source.length + offset : offset });
    }
}
