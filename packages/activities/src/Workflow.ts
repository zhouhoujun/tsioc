import { Injectable, AbstractType } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './activities/Activity';

export interface WorkflowDefinition {
    /**
     * 工作流名称
     */
    name: string;
    /**
     * 工作流描述
     */
    description?: string;
    /**
     * 工作流版本
     */
    version?: string;    
    /**
     * 是否启用工作流历史记录
     */
    enableHistory?: boolean;
    /**
     * 是否启用工作流监控
     */
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
