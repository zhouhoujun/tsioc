import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { MetadataCompiler, ModuleMetadata, ClassMetadata } from '../MetadataCompiler';
import { ComponentCompileInfo } from './ComponentParseActivity';

export interface MetadataGenerateOptions {
    version?: number;
    flatModuleOutFile?: string;
    flatModuleId?: string;
    generateMetadata?: boolean;
}

@Directive({ selector: 'metadata-generate' })
export class MetadataGenerateActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: MetadataGenerateOptions = {};

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    @Attribute()
    componentInfos?: Map<string, ComponentCompileInfo>;

    private metadataCompiler: MetadataCompiler;

    constructor() {
        super();
        this.metadataCompiler = new MetadataCompiler();
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const globby = require('globby');

        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns, { cwd: process.cwd() });

            const compilerOptions: ts.CompilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ES2020,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                skipLibCheck: true
            };

            const allMetadata: Record<string, ClassMetadata> = {};
            const origins: Record<string, string> = {};

            for (const filePath of filePaths) {
                const moduleMetadata = this.metadataCompiler.compileModule(filePath, compilerOptions);

                const info = this.componentInfos?.get(filePath);
                if (info && moduleMetadata.metadata) {
                    for (const [className, classMeta] of Object.entries(moduleMetadata.metadata)) {
                        if (info.decoratorType === 'Component' || info.decoratorType === 'Directive') {
                            classMeta.decorators = classMeta.decorators || [];

                            if (info.decoratorType === 'Component') {
                                classMeta.decorators.push(
                                    { name: info.decoratorType, arguments: [{ selector: info.selector }] }
                                );
                                if (info.templateUrl) {
                                    classMeta.decorators.push({ name: 'templateUrl', arguments: [info.templateUrl] });
                                }
                                if (info.styleUrls?.length) {
                                    classMeta.decorators.push({ name: 'styleUrls', arguments: [info.styleUrls] });
                                }
                            } else {
                                classMeta.decorators.push(
                                    { name: info.decoratorType, arguments: [{ selector: info.selector }] }
                                );
                            }
                        }

                        allMetadata[className] = classMeta;
                    }
                }

                if (moduleMetadata.metadata && Object.keys(moduleMetadata.metadata).length > 0) {
                    const relativePath = path.relative(process.cwd(), filePath);
                    const metadataPath = path.join(this.outDir, relativePath.replace(/\.ts$/, '.metadata.json'));
                    const metadataDir = path.dirname(metadataPath);

                    if (!fs.existsSync(metadataDir)) {
                        fs.mkdirSync(metadataDir, { recursive: true });
                    }

                    fs.writeFileSync(metadataPath, JSON.stringify(moduleMetadata, null, 2), 'utf-8');
                }

                if (moduleMetadata.metadata) {
                    Object.assign(allMetadata, moduleMetadata.metadata);
                }
                if (moduleMetadata.origins) {
                    Object.assign(origins, moduleMetadata.origins);
                }
            }

            if (this.options.flatModuleOutFile && Object.keys(allMetadata).length > 0) {
                await this.generateFlatModuleBundle(allMetadata, origins);
            }

            return {
                success: true,
                data: {
                    totalClasses: Object.keys(allMetadata).length,
                    metadata: allMetadata,
                    flatModuleGenerated: !!this.options.flatModuleOutFile
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private async generateFlatModuleBundle(
        allMetadata: Record<string, ClassMetadata>,
        origins: Record<string, string>
    ): Promise<void> {
        const flatModulePath = path.join(this.outDir, this.options.flatModuleOutFile!);
        const flatModuleId = this.options.flatModuleId || path.basename(this.options.flatModuleOutFile!, '.metadata.json');

        const flatMetadata: Record<string, ClassMetadata> = {};
        for (const [name, classMeta] of Object.entries(allMetadata)) {
            flatMetadata[name] = {
                ...classMeta,
                __symbolic: 'class',
                name
            };
        }

        const flatModule: ModuleMetadata = {
            __symbolic: 'module',
            version: this.options.version || 4,
            metadata: flatMetadata,
            origins
        };

        const outDir = path.dirname(flatModulePath);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        fs.writeFileSync(flatModulePath, JSON.stringify(flatModule, null, 2), 'utf-8');
    }
}
