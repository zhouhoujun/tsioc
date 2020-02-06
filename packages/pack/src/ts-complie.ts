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
            compilerOptions
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
