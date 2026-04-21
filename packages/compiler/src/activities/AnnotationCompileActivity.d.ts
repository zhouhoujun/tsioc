import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
export interface AnnotationCompileOptions {
    outDir?: string;
    outFile?: string;
    includeDecorators?: string[];
    excludeDecorators?: string[];
}
export interface AnnotationResult {
    file: string;
    outputFile: string;
    classesProcessed: number;
}
export declare class AnnotationCompileActivity extends Activity {
    src: string;
    outDir: string;
    options: AnnotationCompileOptions;
    exclude: string[];
    execute(context: ActivityContext): Promise<ActivityResult>;
    private compileFile;
    private processSourceFile;
    private transformSourceFile;
}
