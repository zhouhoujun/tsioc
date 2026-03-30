import { Attribute, Component } from '@tsdi/components';
import { ActivityContext, ActivityResult, SequenceActivity } from '@tsdi/activities';
import { DiagnosticInfo } from './activities/EsbuildBuildActivity';
import { ComponentCompileInfo } from './activities/ComponentParseActivity';
import { OutputStyle } from './activities/EsbuildBuildActivity';

export interface CompilerOptions {
    src?: string;
    outDir?: string;
    target?: string;
    format?: 'cjs' | 'esm' | 'iife';
    platform?: 'browser' | 'node';
    bundle?: boolean;
    minify?: boolean;
    sourcemap?: boolean;
    declaration?: boolean;
    generateMetadata?: boolean;
    flatModuleOutFile?: string;
    inlineStyles?: boolean;
    inlineTemplate?: boolean;
    outputStyle?: OutputStyle;
}

export interface CompileResult {
    success: boolean;
    files: string[];
    errors: DiagnosticInfo[];
    warnings: DiagnosticInfo[];
    outputFiles: string[];
    components: ComponentCompileInfo[];
    duration: number;
}

@Component({
    selector: 'compiler',
    template: `
        <source-files [src]="src" (done)="onFiles($event)"></source-files>
        <component-parse [src]="src" (done)="onParsed($event)"></component-parse>
        <esbuild-build [src]="src" [outDir]="outDir" [outputStyle]="outputStyle" [target]="target"></esbuild-build>
        <declaration-generate [src]="src" [outDir]="outDir"></declaration-generate>
    `
})
export class CompilerActivity extends SequenceActivity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    target = 'es2022';

    @Attribute()
    format: 'cjs' | 'esm' | 'iife' = 'esm';

    @Attribute()
    platform: 'browser' | 'node' = 'node';

    @Attribute()
    bundle = false;

    @Attribute()
    minify = false;

    @Attribute()
    sourcemap = true;

    @Attribute()
    declaration = true;

    @Attribute()
    generateMetadata = true;

    @Attribute()
    flatModuleOutFile?: string;

    @Attribute()
    inlineStyles = false;

    @Attribute()
    inlineTemplate = false;

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    @Attribute()
    outputStyle?: OutputStyle;

    private files: string[] = [];
    private componentInfos: Map<string, ComponentCompileInfo> = new Map();

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();
        return {
            success: true,
            data: {
                files: this.files,
                components: Array.from(this.componentInfos.values()),
                errors: [],
                warnings: [],
                outputFiles: [],
                duration: Date.now() - startTime
            }
        };
    }
}
