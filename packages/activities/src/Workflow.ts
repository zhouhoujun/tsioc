import { AbstractType, Type, Provider, Modules, ModuleType } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { bootstrapComponent, ComponentBootOptions } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './activities/Activity';
import { WorkflowModule } from './workflow.module';
import { SequenceActivity } from './activities';

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

export interface WorkflowOptions extends ComponentBootOptions {
    
    [key: string]: any;
}


export class Workflow {
    
    static runSequence(template: any, options?: WorkflowOptions): Promise<ApplicationContext<SequenceActivity>> {
        return Workflow.run(SequenceActivity, options);
    }

    static run<T>(module: Type<T>, options?: WorkflowOptions): Promise<ApplicationContext<T>> {
        
        return bootstrapComponent(module, {
            ...options,
            deps: [WorkflowModule, ...(options?.deps || [])]
        });
    }
}
