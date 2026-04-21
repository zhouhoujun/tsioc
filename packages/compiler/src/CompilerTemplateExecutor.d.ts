import { CompilerTemplate, CompilerTemplateResult } from './CompilerTemplate';
import { TsConfigReader, MergedCompilerOptions, RuntimeEnvironment } from './TsConfigReader';
export declare class CompilerTemplateExecutor {
    private tsConfigReader;
    constructor(tsConfigPath?: string);
    execute(template: CompilerTemplate, runtime?: RuntimeEnvironment): Promise<CompilerTemplateResult>;
    private resolveOptions;
    private buildActivities;
    private evaluateDirective;
    private createActivity;
    private resolveConfig;
    private resolveValue;
    private interpolateString;
    private getValueByPath;
    setTsConfigPath(path: string): void;
    getMergedOptions(runtime?: RuntimeEnvironment): MergedCompilerOptions;
    getTsConfigReader(): TsConfigReader;
}
