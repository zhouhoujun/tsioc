import { Singleton } from '@tsdi/ioc';
import { iocAnnotations } from '@tsdi/annotations';
import {
    CompilerOptions, transpileModule, flattenDiagnosticMessageText, DiagnosticCategory,
    convertCompilerOptionsFromJson, readConfigFile, parseJsonConfigFileContent, Diagnostic
} from 'typescript';
import * as ts from 'typescript';
import * as path from 'path';

@Singleton()
export class TsComplie {

    compile(fileName: string, compilerOptions: CompilerOptions, code: string, annotation?: boolean): { code: string; map: string } {

        const transformed = transpileModule(annotation ? iocAnnotations(code) : code, {
            fileName: fileName,
            reportDiagnostics: true,
            compilerOptions,
            transformers: {
                afterDeclarations: []
            }
        });

        // All errors except `Cannot compile modules into 'es6' when targeting 'ES5' or lower.`
        const diagnostics: Diagnostic[] = transformed.diagnostics ?
            transformed.diagnostics.filter(diagnostic => diagnostic.code !== 1204) : [];

        let fatalError = false;

        diagnostics.forEach(diagnostic => {
            const message = flattenDiagnosticMessageText(diagnostic.messageText, '\n');

            if (diagnostic.file) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

                console.error(`${diagnostic.file.fileName}(${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}`);
            } else {
                console.error(`Error: ${message}`);
            }

            if (diagnostic.category === DiagnosticCategory.Error) {
                fatalError = true;
            }
        });

        if (fatalError) {
            throw new Error(`There were TypeScript errors transpiling`);
        }

        return {
            code: transformed.outputText,
            // Rollup expects `map` to be an object so we must parse the string
            map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
        };
    }

    createProject(projectDirectory: string, tsconfig: string, settings: CompilerOptions): CompilerOptions {
        let compilerOptions: CompilerOptions;
        // let projectReferences: ReadonlyArray<ProjectReference>;
        const settingsResult = convertCompilerOptionsFromJson(settings || {}, projectDirectory);
        // if (settingsResult.errors) {
        //     throw settingsResult.errors;
        // }
        compilerOptions = settingsResult.options;

        let tsConfig = readConfigFile(tsconfig, ts.sys.readFile);
        if (tsConfig.error) {
            console.log(tsConfig.error.messageText);
        }

        let parsed: ts.ParsedCommandLine =
            parseJsonConfigFileContent(
                tsConfig.config || {},
                this.getTsconfigSystem(ts),
                path.resolve(projectDirectory),
                compilerOptions,
                tsconfig);

        // if (parsed.errors) {
        //     throw parsed.errors;
        // }

        compilerOptions = parsed.options;
        // projectReferences = parsed.projectReferences;
        return compilerOptions;
    }

    protected getTsconfigSystem(typescript: typeof ts): ts.ParseConfigHost {
        return {
            useCaseSensitiveFileNames: typescript.sys.useCaseSensitiveFileNames,
            readDirectory: () => [],
            fileExists: typescript.sys.fileExists,
            readFile: typescript.sys.readFile
        };
    }
}

// import { Singleton } from '@tsdi/ioc';
// import { iocAnnotations } from '@tsdi/annotations';
// import {
//     CompilerOptions, sys, createSourceFile, ScriptTarget, createProgram, Diagnostic, DiagnosticCategory, formatDiagnostics,
//     convertCompilerOptionsFromJson, readConfigFile, parseJsonConfigFileContent, ParsedCommandLine, System, ParseConfigHost, transform, ProjectReference,
// } from 'typescript';
// import * as path from 'path';
// import { tsdexp, jsFileExp, mapexp } from './exps';

// @Singleton()
// export class TsComplie {

//     compile(parsed: ParsedCommandLine, fileName: string, sourceText: string, annotation?: boolean): { code: string; map: string, dts?: string, emitSkipped?: boolean } {

//         const tempSourceFile = createSourceFile(
//             fileName,
//             annotation ? iocAnnotations(sourceText) : sourceText,
//             ScriptTarget.Latest
//         );

//         const outputs = new Map<string, string>();
//         const host = {
//             getSourceFile: (name) => {
//                 if (name === fileName) {
//                     return tempSourceFile;
//                 }
//             },
//             getDefaultLibFileName: () => 'lib.d.ts',
//             getCurrentDirectory: () => '',
//             getDirectories: () => [],
//             getCanonicalFileName: (fileName) => fileName,
//             useCaseSensitiveFileNames: () => true,
//             getNewLine: () => '\n',
//             fileExists: (fileName) => fileName === fileName,
//             readFile: (_fileName) => '',
//             writeFile: (fileName, text) => outputs.set(fileName, text),
//         };
//         const program = parsed.projectReferences ?
//             createProgram({
//                 rootNames: [fileName],
//                 projectReferences: parsed.projectReferences,
//                 host: host,
//                 options: parsed.options
//             })
//             : createProgram([fileName], parsed.options, host);

//         const diagnostics = program.getSyntacticDiagnostics(tempSourceFile);
//         if (!this.validateDiagnostics(diagnostics, true)) {
//             return {
//                 code: null,
//                 map: null,
//                 emitSkipped: true,
//             };
//         }

//         program.emit();

//         let code: string, map: string = null, dts: string;
//         outputs.forEach((source, f) => {
//             if (tsdexp.test(f)) {
//                 dts = source;
//             } else if (jsFileExp.test(f)) {
//                 code = source;
//             } else if (mapexp.test(f)) {
//                 map = source;
//             }
//         });
//         outputs.clear();
//         return { code, map, dts };
//     }

//     createProject(projectDirectory: string, tsconfig: string, settings: CompilerOptions): ParsedCommandLine {
//         let compilerOptions: CompilerOptions;
//         // let projectReferences: ReadonlyArray<ProjectReference>;
//         const settingsResult = convertCompilerOptionsFromJson(settings || {}, projectDirectory);
//         // if (settingsResult.errors) {
//         //     throw settingsResult.errors;
//         // }
//         compilerOptions = settingsResult.options;

//         let tsConfig = readConfigFile(tsconfig, sys.readFile);
//         if (tsConfig.error) {
//             console.log(tsConfig.error.messageText);
//         }

//         let parsed: ParsedCommandLine =
//             parseJsonConfigFileContent(
//                 tsConfig.config || {},
//                 this.getTsconfigSystem(sys),
//                 path.resolve(projectDirectory),
//                 compilerOptions,
//                 tsconfig);

//         if (parsed.errors) {
//             throw parsed.errors;
//         }

//         return parsed;
//     }

//     protected getTsconfigSystem(sys: System): ParseConfigHost {
//         return {
//             useCaseSensitiveFileNames: sys.useCaseSensitiveFileNames,
//             readDirectory: () => [],
//             fileExists: sys.fileExists,
//             readFile: sys.readFile
//         };
//     }

//     validateDiagnostics(diagnostics: ReadonlyArray<Diagnostic>, strict?: boolean): boolean {
//         // Print error diagnostics.

//         const hasError = diagnostics.some(diag => diag.category === DiagnosticCategory.Error);
//         if (hasError) {
//             // Throw only if we're in strict mode, otherwise return original content.
//             if (strict) {
//                 const errorMessages = formatDiagnostics(diagnostics, {
//                     getCurrentDirectory: () => sys.getCurrentDirectory(),
//                     getNewLine: () => sys.newLine,
//                     getCanonicalFileName: (f: string) => f,
//                 });

//                 throw new Error(`
//               TS failed with the following error messages:
//               ${errorMessages}
//             `);
//             } else {
//                 return false;
//             }
//         }

//         return true;
//     }
// }
