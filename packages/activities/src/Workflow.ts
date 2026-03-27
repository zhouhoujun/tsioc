import { AbstractType, Type, Provider } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { Activity, ActivityContext, ActivityResult } from './activities/Activity';

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

export interface WorkflowOptions {
    baseURL?: string;
    src?: string;
    outDir?: string;
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
        
        return await Application.run(module, appOptions);
    }
}