import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
export type DecoratorType = 'Component' | 'Directive' | 'Pipe' | 'Injectable' | 'Service' | 'Module';
export interface ComponentCompileInfo {
    name: string;
    decoratorType: DecoratorType;
    selector?: string;
    templateUrl?: string;
    template?: string;
    styleUrls?: string[];
    styles?: string[];
    viewEncapsulation?: 'None' | 'Emulated' | 'ShadowDom';
    changeDetection?: 'Default' | 'OnPush';
    inputs?: string[];
    outputs?: string[];
    providers?: string[];
    imports?: string[];
    exports?: string[];
    declarations?: string[];
}
export interface ComponentParseResult {
    file: string;
    componentInfo?: ComponentCompileInfo;
}
export declare class ComponentParseActivity extends Activity {
    src: string;
    exclude: string[];
    inlineTemplate: boolean;
    execute(context: ActivityContext): Promise<ActivityResult>;
    private extractComponentInfo;
    private parseDecoratorOptions;
}
