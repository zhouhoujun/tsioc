import { ProviderTypes } from '@tsdi/ioc';

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
    providers?: ProviderTypes[];
    viewQueries: QueryMetadataFacade[];
}

export interface ComponentMetadataFacade extends DirectiveMetadataFacade {
    template: string;
    preserveWhitespaces: boolean;
    animations?: any[];
    pipes: Map<string, any>;
    directives: {selector: string, expression: any}[];
    styles: string[];
    viewProviders?: ProviderTypes[];
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
