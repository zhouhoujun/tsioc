import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
export interface SourceFile {
    fileName: string;
    filePath: string;
    content: string;
    mtime?: number;
}
export declare class SourceFilesActivity extends Activity {
    src: string;
    exclude: string[];
    execute(context: ActivityContext): Promise<ActivityResult>;
}
