import { AbstractType, Type, Provider, Modules, ModuleType } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { Activity, ActivityContext, ActivityResult } from './activities/Activity';
import { WorkflowModule } from './workflow.module';

export interface WorkflowDefinition {
    name: string;
    description?: string;
    version?: string;    
    enableHistory?: boolean;
    enableMonitoring?: boolean;
    activities: AbstractType<Activity>[];
    transitions: WorkflowTransition[];
    initialState: string;
    finalStates: string[];
}

export interface WorkflowTransition {
    from: string;
    to: string;
    condition?: (context: ActivityContext) => boolean;
}

export type TemplateType = 'xml' | 'json';

export interface WorkflowOptions {
    baseURL?: string;
    src?: string;
    outDir?: string;
    deps?: ModuleType[];
    template?: TemplateType;
    [key: string]: any;
}

export class Workflow {
    
    static async run<T>(module: Type<T>, options?: WorkflowOptions): Promise<ApplicationContext<T>> {
        
        const appOptions: any = {};
        if (options?.baseURL) {
            appOptions.baseURL = options.baseURL;
        }
        
        const providers: Provider[] = [];
        if (options && Object.keys(options).length > 0) {
            providers.push({
                provide: 'COMPILER_OPTIONS',
                useValue: options
            });
        }
        
        if (providers.length > 0) {
            appOptions.providers = providers;
        }

        const platformDeps: ModuleType[] = [WorkflowModule];

        const templateType = options?.template || 'xml';
        
        if (templateType === 'xml') {
            const { XmlTemplateModule } = await import('@tsdi/components/xml');
            platformDeps.push(XmlTemplateModule);
        } else if (templateType === 'json') {
            const { JsonTemplateModule } = await import('@tsdi/components/json');
            platformDeps.push(JsonTemplateModule);
        }

        appOptions.platformDeps = platformDeps;
        
        return await Application.run(module, appOptions);
    }
}
