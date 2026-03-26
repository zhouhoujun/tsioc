import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import * as globby from 'globby';

const outDir = path.resolve(__dirname, '../../dist/ioc');
const srcDir = path.resolve(__dirname, 'src');

async function compile() {
    const files = await globby(['src/**/*.ts', '!node_modules', '!**/*.spec.ts', '!**/*.test.ts'], {
        cwd: __dirname
    });

    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        declaration: true,
        sourceMap: true,
        outDir,
        rootDir: srcDir,
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        lib: ['lib.es2020.d.ts'],
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        resolveJsonModule: true,
        importHelpers: true,
        noEmitHelpers: true
    };

    const program = ts.createProgram(files, compilerOptions);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    const errors: ts.Diagnostic[] = [];
    const warnings: ts.Diagnostic[] = [];

    diagnostics.forEach(diag => {
        if (diag.category === ts.DiagnosticCategory.Error) {
            errors.push(diag);
        } else if (diag.category === ts.DiagnosticCategory.Warning) {
            warnings.push(diag);
        }
    });

    if (errors.length > 0) {
        console.error('Compilation errors:');
        errors.forEach(diag => {
            const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
            if (diag.file) {
                const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start!);
                console.error(`  ${diag.file.fileName}:${line + 1}:${character + 1} - ${message}`);
            } else {
                console.error(`  ${message}`);
            }
        });
        process.exit(1);
    }

    if (warnings.length > 0) {
        console.warn('Compilation warnings:');
        warnings.forEach(diag => {
            const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
            console.warn(`  ${message}`);
        });
    }

    const emitResult = program.emit();
    
    if (emitResult.diagnostics.length > 0) {
        console.error('Emit errors:');
        emitResult.diagnostics.forEach(diag => {
            const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
            console.error(`  ${message}`);
        });
        process.exit(1);
    }

    console.log(`Successfully compiled ${files.length} files to ${outDir}`);
}

if (process.cwd() === __dirname) {
    compile().catch(err => {
        console.error(err);
        process.exit(1);
    });
}