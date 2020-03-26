
/**
 * scource file.
 */
export class SourceFile {
    constructor(public content: string, public url: string) {
    }
}

/**
 * location in scource file.
 */
export class SourceLocation {
    constructor(source: SourceFile, public offset: number, public line: number, public col: number) {
    }
}

/**
 * the scource location to parse.
 */
export class ParseLocation {
    constructor(public start: SourceLocation, public end: SourceLocation, detail?: string) {
    }
}

