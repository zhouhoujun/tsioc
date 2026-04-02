import { AbstractType, Type, Provider, Modules, ModuleType, Injectable, Injector } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { bootstrapComponent, ComponentBootOptions } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './activities/Activity';
import { WorkflowModule } from './workflow.module';
import { SequenceActivity } from './activities';
import { SequenceWorkflowTemplate, WorkflowTemplateResult, ActivityTemplateConfig } from './WorkflowTemplate';

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

@Injectable()
export class Workflow {
    
    /**
     * Run sequence workflow from template
     * 从模板运行顺序工作流
     * 
     * @param template Sequence workflow template
     * @param options Workflow options
     * @returns Execution result
     */
    static async runSequence(
        template: SequenceWorkflowTemplate,
        options?: WorkflowOptions
    ): Promise<WorkflowTemplateResult> {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        const activityResults = new Map<string, ActivityResult>();
        
        try {
            const activities = await Workflow.createActivitiesFromTemplate(template);
            
            const sequenceActivity = new SequenceActivity();
            sequenceActivity.activities = activities;
            sequenceActivity.continueOnError = template.continueOnError;
            sequenceActivity.onError = template.onError;
            
            const context: ActivityContext = options?.context || {};
            
            if (template.beforeExecute) {
                await template.beforeExecute(context);
            }
            
            const result = await sequenceActivity.execute(context);
            
            result.data?.results?.forEach((value: ActivityResult, key: Activity) => {
                activityResults.set((key as any).constructor?.name || 'unknown', value);
            });
            
            if (template.afterExecute) {
                await template.afterExecute(context, result);
            }
            
            const endTime = Date.now();
            
            return {
                success: result.success,
                data: result.data,
                error: result.error,
                templateId: template.id,
                executionId,
                executionTime: endTime - startTime,
                activityResults
            };
        } catch (error) {
            const endTime = Date.now();
            return {
                success: false,
                error: error as Error,
                templateId: template.id,
                executionId,
                executionTime: endTime - startTime,
                activityResults
            };
        }
    }

    /**
     * Run workflow with template and return application context
     * 使用模板运行工作流并返回应用上下文
     * 
     * @param template Sequence workflow template
     * @param options Workflow options
     * @returns Application context with sequence activity
     */
    static async runSequenceWithContext(
        template: SequenceWorkflowTemplate,
        options?: WorkflowOptions
    ): Promise<ApplicationContext<SequenceActivity>> {
        const activities = await Workflow.createActivitiesFromTemplate(template);
        
        const sequenceActivity = new SequenceActivity();
        sequenceActivity.activities = activities;
        sequenceActivity.continueOnError = template.continueOnError;
        sequenceActivity.onError = template.onError;
        
        return Workflow.run(SequenceActivity, {
            ...options,
            template
        });
    }

    /**
     * Create activities from template configuration
     * 从模板配置创建活动
     * 
     * @param template Workflow template
     * @returns Array of activities
     */
    private static async createActivitiesFromTemplate(
        template: SequenceWorkflowTemplate
    ): Promise<Activity[]> {
        const activities: Activity[] = [];
        
        for (const activityConfig of template.activities) {
            if (activityConfig.enabled === false) {
                continue;
            }
            
            const activity = await Workflow.createActivityFromConfig(activityConfig);
            if (activity) {
                activities.push(activity);
            }
        }
        
        return activities;
    }

    /**
     * Create activity from configuration
     * 从配置创建活动
     * 
     * @param config Activity template configuration
     * @returns Activity instance or null
     */
    private static async createActivityFromConfig(
        config: ActivityTemplateConfig
    ): Promise<Activity | null> {
        try {
            const ActivityClass = config.type as any;
            const activity = new ActivityClass();
            
            if (config.config) {
                Object.assign(activity, config.config);
            }
            
            return activity;
        } catch (error) {
            console.error(`Failed to create activity from config:`, error);
            return null;
        }
    }

    static run<T>(module: Type<T>, options?: WorkflowOptions): Promise<ApplicationContext<T>> {
        
        return bootstrapComponent(module, {
            ...options,
            deps: [WorkflowModule, ...(options?.deps || [])]
        });
    }
}
