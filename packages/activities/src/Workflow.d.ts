import { AbstractType, Type } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { ComponentBootOptions } from '@tsdi/components';
import { Activity, ActivityContext } from './activities/Activity';
import { SequenceActivity } from './activities';
import { SequenceWorkflowTemplate, WorkflowTemplateResult } from './WorkflowTemplate';
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
export declare class Workflow {
    /**
     * Run sequence workflow from template
     * 从模板运行顺序工作流
     *
     * @param template Sequence workflow template
     * @param options Workflow options
     * @returns Execution result
     */
    static runSequence(template: SequenceWorkflowTemplate, options?: WorkflowOptions): Promise<WorkflowTemplateResult>;
    /**
     * Run workflow with template and return application context
     * 使用模板运行工作流并返回应用上下文
     *
     * @param template Sequence workflow template
     * @param options Workflow options
     * @returns Application context with sequence activity
     */
    static runSequenceWithContext(template: SequenceWorkflowTemplate, options?: WorkflowOptions): Promise<ApplicationContext<SequenceActivity>>;
    /**
     * Create activities from template configuration
     * 从模板配置创建活动
     *
     * @param template Workflow template
     * @returns Array of activities
     */
    private static createActivitiesFromTemplate;
    /**
     * Create activity from configuration
     * 从配置创建活动
     *
     * @param config Activity template configuration
     * @returns Activity instance or null
     */
    private static createActivityFromConfig;
    static run<T>(module: Type<T>, options?: WorkflowOptions): Promise<ApplicationContext<T>>;
}
