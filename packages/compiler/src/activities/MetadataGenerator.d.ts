import * as ts from 'typescript';
import { Annotation } from '@tsdi/ioc';
export interface ClassMetadata {
    __symbolic: 'class';
    name: string;
    decorators?: DecoratorMetadata[];
    members?: Record<string, MemberMetadata[]>;
    statics?: Record<string, StaticMetadata>;
}
export interface DecoratorMetadata {
    name: string;
    type?: string;
    arguments?: any[];
    identifier?: string;
    module?: string;
}
export interface MemberMetadata {
    __symbolic: 'constructor' | 'property' | 'method';
    decorators?: DecoratorMetadata[];
    parameters?: ParameterMetadata[];
    type?: string;
    returnType?: string;
}
export interface ParameterMetadata {
    type?: string;
    name?: string;
    decorators?: DecoratorMetadata[];
    optional?: boolean;
}
export interface StaticMetadata {
    __symbolic: 'function';
    parameters: ParameterMetadata[];
    value?: any;
}
export interface ModuleMetadata {
    __symbolic: 'module';
    version: number;
    metadata: Record<string, ClassMetadata>;
    origins: Record<string, string>;
}
export interface MetadataCompilerOptions {
    version?: number;
    includeClassMetadata?: boolean;
    includeDecoratorArgs?: boolean;
    flattenDeclarations?: boolean;
}
export declare class MetadataGenerator {
    private typeChecker;
    private program;
    private options;
    constructor(options?: MetadataCompilerOptions);
    compile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): ClassMetadata[];
    compileModule(filePath: string, compilerOptions: ts.CompilerOptions): ModuleMetadata;
    private extractClassMetadata;
    private extractClassDecorators;
    private parseDecorator;
    private extractMembers;
    private extractParameters;
    private extractMemberDecorators;
    private serializeValue;
    writeMetadataFile(moduleMetadata: ModuleMetadata, outputPath: string): void;
    compileAnnotation(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): Annotation | null;
}
