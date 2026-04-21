import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { ComponentCompileInfo } from './ComponentParseActivity';
export interface MetadataGenerateOptions {
    version?: number;
    flatModuleOutFile?: string;
    flatModuleId?: string;
    generateMetadata?: boolean;
}
export declare class MetadataGenerateActivity extends Activity {
    src: string;
    outDir: string;
    options: MetadataGenerateOptions;
    exclude: string[];
    componentInfos?: Map<string, ComponentCompileInfo>;
    private metadataCompiler;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
    private generateFlatModuleBundle;
}
