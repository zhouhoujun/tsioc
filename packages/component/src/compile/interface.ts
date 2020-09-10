import { Provider } from '@tsdi/ioc';

/**
 * Flags passed into template functions to determine which blocks (i.e. creation, update)
 * should be executed.
 *
 * Typically, a template runs both the creation block and the update block on initialization and
 * subsequent runs only execute the update block. However, dynamically created views require that
 * the creation block be executed separately from the update block (for backwards compat).
 */
export enum RenderFlags {
    /* Whether to run the creation block (e.g. create elements and directives) */
    Create = 1,
    /* Whether to run the update block (e.g. refresh bindings) */
    Update
}

export interface ParseSourceSpan {
    start: any;
    end: any;
    details: any;
}

export enum ResolvedDependencyType {
    Token = 0,
    Attribute = 1,
    ChangeDetectorRef = 2,
    Invalid = 3,
}

export interface DependencyMetadataFacade {
    token: any;
    resolved: ResolvedDependencyType;
    host: boolean;
    optional: boolean;
    self: boolean;
    skipSelf: boolean;
}

export interface PipeMetadataFacade {
    name: string;
    type: any;
    typeArgumentCount: number;
    pipeName: string;
    deps: DependencyMetadataFacade[] | null;
    pure: boolean;
}


export interface DirectiveMetadataFacade {
    name: string;
    type: any;
    typeArgumentCount: number;
    typeSourceSpan: ParseSourceSpan;
    deps: DependencyMetadataFacade[] | null;
    selector: string | null;
    queries: QueryMetadataFacade[];
    host: { [key: string]: string };
    propMetadata: { [key: string]: any[] };
    lifecycle: { usesOnChanges: boolean; };
    inputs: string[];
    outputs: string[];
    usesInheritance: boolean;
    exportAs?: string[];
    providers?: Provider[];
    viewQueries: QueryMetadataFacade[];
}

export interface ComponentMetadataFacade extends DirectiveMetadataFacade {
    template: string;
    preserveWhitespaces: boolean;
    animations?: any[];
    pipes: Map<string, any>;
    directives: { selector: string, expression: any }[];
    styles: string[];
    viewProviders?: Provider[];
    interpolation?: [string, string];
    changeDetection?: number;
}

export interface QueryMetadataFacade {
    propertyName: string;
    first: boolean;
    predicate: any | string[];
    descendants: boolean;
    read: any | null;
    static: boolean;
}
