import { Singleton, Injectable, Execption } from '@tsdi/ioc';
import { iocAnnotations } from '@tsdi/annotations';
import {
    CompilerOptions, sys, createSourceFile, ScriptTarget, createProgram, Diagnostic, DiagnosticCategory, formatDiagnostics,
    convertCompilerOptionsFromJson, readConfigFile, parseJsonConfigFileContent, ParsedCommandLine, System, ParseConfigHost, transform, ProjectReference, transpileModule, flattenDiagnosticMessageText, getPreEmitDiagnostics, createCompilerHost, ScriptKind, Program,
} from 'typescript';
import * as path from 'path';
import { tsdexp, jsFileExp, mapexp } from './exps';

@Injectable()
export class TsComplie {


    private program: Program;

    compile(options: CompilerOptions, fileName: string, sourceText: string,  annotation?: boolean): { code: string; map: string, dts?: string, emitSkipped?: boolean } {
        const host = createCompilerHost(options);
        const outputs = new Map<string, string>();
        const tempSourceFile = createSourceFile(
            fileName,
            annotation ? iocAnnotations(sourceText) : sourceText,
            ScriptTarget.Latest,
            false,
            ScriptKind.TS
        );

        host.getSourceFile = (name, languageVersion, error) => {
            if (name === fileName) {
                return tempSourceFile;
            }
        };
        host.writeFile = (fileName: string, contents: string) => outputs.set(fileName, contents);
        const old = this.program;
        const program = this.program = createProgram([fileName], options, host, old);
        const emitResult = program.emit();

        const allDiagnostics = program.getSyntacticDiagnostics(tempSourceFile).concat(emitResult.diagnostics);

        if (!this.validateDiagnostics(allDiagnostics, true)) {
            return {
                code: null,
                map: null,
                emitSkipped: true,
            };
        }

        let emitSkipped = emitResult.emitSkipped;
        let code: string, map: string = null, dts: string;
        outputs.forEach((source, f) => {
            if (tsdexp.test(f)) {
                dts = source;
            } else if (jsFileExp.test(f)) {
                code = source;
            } else if (mapexp.test(f)) {
                map = source;
            }
        });
        outputs.clear();
        return { code, map, dts, emitSkipped };

    }

    transpileModule(compilerOptions: CompilerOptions, fileName: string, code: string, annotation?: boolean): { code: string; map: string } {

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

        if (!this.validateDiagnostics(diagnostics, true)) {
            throw new Execption(`There were TypeScript errors transpiling`);
        }

        return {
            code: transformed.outputText,
            // Rollup expects `map` to be an object so we must parse the string
            map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
        };
    }

    parseTsconfig(projectDirectory: string, tsconfig: string, settings: CompilerOptions): ParsedCommandLine {
        let compilerOptions: CompilerOptions;
        // let projectReferences: ReadonlyArray<ProjectReference>;
        const settingsResult = convertCompilerOptionsFromJson(settings || {}, projectDirectory);
        // if (settingsResult.errors) {
        //     throw settingsResult.errors;
        // }
        compilerOptions = settingsResult.options;

        let tsConfig = readConfigFile(tsconfig, sys.readFile);
        if (tsConfig.error) {
            console.log(tsConfig.error.messageText);
        }

        let parsed: ParsedCommandLine =
            parseJsonConfigFileContent(
                tsConfig.config || {},
                this.getTsconfigSystem(sys),
                path.resolve(projectDirectory),
                compilerOptions,
                tsconfig);

        this.validateDiagnostics(parsed.errors);

        return parsed;
    }

    protected getTsconfigSystem(sys: System): ParseConfigHost {
        return {
            useCaseSensitiveFileNames: sys.useCaseSensitiveFileNames,
            readDirectory: () => [],
            fileExists: sys.fileExists,
            readFile: sys.readFile
        };
    }

    validateDiagnostics(diagnostics: ReadonlyArray<Diagnostic>, strict?: boolean): boolean {
        // Print error diagnostics.

        const hasError = diagnostics.some(diag => diag.category === DiagnosticCategory.Error);
        if (hasError) {
            // Throw only if we're in strict mode, otherwise return original content.
            if (strict) {
                const errorMessages = formatDiagnostics(diagnostics, {
                    getCurrentDirectory: () => sys.getCurrentDirectory(),
                    getNewLine: () => sys.newLine,
                    getCanonicalFileName: (f: string) => f,
                });

                throw new Error(`
              TS failed with the following error messages:
              ${errorMessages}
            `);
            } else {
                return false;
            }
        }

        return true;
    }
}
