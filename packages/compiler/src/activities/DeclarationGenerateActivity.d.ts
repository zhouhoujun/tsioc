import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
export interface DeclarationGenerateOptions {
    declaration?: boolean;
    declarationMap?: boolean;
    emitDeclarationOnly?: boolean;
}
export declare class DeclarationGenerateActivity extends Activity {
    src: string;
    outDir: string;
    options: DeclarationGenerateOptions;
    exclude: string[];
    execute(context: ActivityContext): Promise<ActivityResult>;
}
