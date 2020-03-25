export interface SourceRange {
    readonly start: number;
    readonly end: number;
}

export class ExpRange {
    constructor(public start: number, public end: number) {

    }

    toAbsolute(offset: number): SourceRange {
        const start = offset + this.start;
        const end = offset + this.end;
        return { start, end };
    }
}

/**
 * AST base.
 */
export class Ast {
    constructor(public exp: ExpRange, public source: SourceRange) {

    }

}
