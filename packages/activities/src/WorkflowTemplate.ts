import { Type, AbstractType } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './activities/Activity';
import { SequenceActivity } from './activities/Sequence';

/**
 * 活动模板配置
 * Activity template configuration
 */
export interface ActivityTemplateConfig {
    /**
     * 活动类型
     * Activity type
     */
    type: Type<Activity> | AbstractType<Activity>;
    /**
     * 活动名称
     * Activity name
     */
    name?: string;
    /**
     * 活动描述
     * Activity description
     */
    description?: string;
    /**
     * 活动配置
     * Activity configuration
     */
    config?: Record<string, any>;
    /**
     * 是否启用
     * Is enabled
     */
    enabled?: boolean;
    /**
     * 执行条件
     * Execution condition
     */
    condition?: (context: ActivityContext) => boolean | Promise<boolean>;
}

/**
 * 序列工作流模板
 * Sequence workflow template
 */
export interface SequenceWorkflowTemplate {
    /**
     * 模板ID
     * Template ID
     */
    id?: string;
    /**
     * 模板名称
     * Template name
     */
    name: string;
    /**
     * 模板描述
     * Template description
     */
    description?: string;
    /**
     * 模板版本
     * Template version
     */
    version?: string;
    /**
     * 活动列表配置
     * Activity list configuration
     */
    activities: ActivityTemplateConfig[];
    /**
     * 是否在错误时继续执行
     * Continue on error
     */
    continueOnError?: boolean;
    /**
     * 错误处理函数
     * Error handler
     */
    onError?: (error: Error) => Promise<ActivityResult>;
    /**
     * 执行前钩子
     * Pre-execution hook
     */
    beforeExecute?: (context: ActivityContext) => Promise<void>;
    /**
     * 执行后钩子
     * Post-execution hook
     */
    afterExecute?: (context: ActivityContext, result: ActivityResult) => Promise<void>;
    /**
     * 模板元数据
     * Template metadata
     */
    metadata?: Record<string, any>;
}

/**
 * 工作流模板类型
 * Workflow template types
 */
export type WorkflowTemplateType = 'sequence' | 'parallel' | 'conditional';

/**
 * 通用工作流模板接口
 * Generic workflow template interface
 */
export interface WorkflowTemplate<T extends WorkflowTemplateType = 'sequence'> {
    /**
     * 模板类型
     * Template type
     */
    type: T;
    /**
     * 模板ID
     * Template ID
     */
    id?: string;
    /**
     * 模板名称
     * Template name
     */
    name: string;
    /**
     * 模板描述
     * Template description
     */
    description?: string;
    /**
     * 模板配置
     * Template configuration
     */
    config: T extends 'sequence' ? SequenceWorkflowTemplate : never;
}

/**
 * 工作流模板执行结果
 * Workflow template execution result
 */
export interface WorkflowTemplateResult<T = any> {
    /**
     * 执行是否成功
     * Execution success
     */
    success: boolean;
    /**
     * 执行数据
     * Execution data
     */
    data?: T;
    /**
     * 执行错误
     * Execution error
     */
    error?: Error;
    /**
     * 模板ID
     * Template ID
     */
    templateId?: string;
    /**
     * 执行ID
     * Execution ID
     */
    executionId?: string;
    /**
     * 执行时间（毫秒）
     * Execution time (ms)
     */
    executionTime?: number;
    /**
     * 各活动执行结果
     * Individual activity results
     */
    activityResults?: Map<string, ActivityResult>;
}

/**
 * 工作流模板构建器选项
 * Workflow template builder options
 */
export interface WorkflowTemplateBuilderOptions {
    /**
     * 默认模板ID前缀
     * Default template ID prefix
     */
    idPrefix?: string;
    /**
     * 是否自动生成ID
     * Auto-generate ID
     */
    autoId?: boolean;
    /**
     * 是否验证模板
     * Validate template
     */
    validate?: boolean;
}

/**
 * 序列工作流模板构建器
 * Sequence workflow template builder
 * 
 * 用于方便地创建序列工作流模板
 * Used to conveniently create sequence workflow templates
 */
export class SequenceWorkflowTemplateBuilder {
    private template: SequenceWorkflowTemplate;
    private activityIndex = 0;

    constructor(name: string, options?: WorkflowTemplateBuilderOptions) {
        this.template = {
            id: options?.autoId ? `${options.idPrefix || 'seq'}_${Date.now()}` : undefined,
            name,
            activities: []
        };
    }

    /**
     * 添加活动到模板
     * Add activity to template
     * 
     * @param type 活动类型 Activity type
     * @param config 活动配置 Activity configuration
     * @returns 构建器实例 Builder instance
     */
    addActivity(type: Type<Activity> | AbstractType<Activity>, config?: Record<string, any>): this {
        this.template.activities.push({
            type,
            name: config?.name || `activity_${this.activityIndex++}`,
            config
        });
        return this;
    }

    /**
     * 添加多个活动到模板
     * Add multiple activities to template
     * 
     * @param activities 活动配置列表 Activity configuration list
     * @returns 构建器实例 Builder instance
     */
    addActivities(activities: ActivityTemplateConfig[]): this {
        activities.forEach(act => {
            this.template.activities.push({
                ...act,
                name: act.name || `activity_${this.activityIndex++}`
            });
        });
        return this;
    }

    /**
     * 设置是否在错误时继续执行
     * Set continue on error
     * 
     * @param continueOnError 是否继续 Whether to continue
     * @returns 构建器实例 Builder instance
     */
    continueOnError(continueOnError: boolean): this {
        this.template.continueOnError = continueOnError;
        return this;
    }

    /**
     * 设置错误处理函数
     * Set error handler
     * 
     * @param handler 错误处理函数 Error handler
     * @returns 构建器实例 Builder instance
     */
    onError(handler: (error: Error) => Promise<ActivityResult>): this {
        this.template.onError = handler;
        return this;
    }

    /**
     * 设置执行前钩子
     * Set pre-execution hook
     * 
     * @param hook 钩子函数 Hook function
     * @returns 构建器实例 Builder instance
     */
    beforeExecute(hook: (context: ActivityContext) => Promise<void>): this {
        this.template.beforeExecute = hook;
        return this;
    }

    /**
     * 设置执行后钩子
     * Set post-execution hook
     * 
     * @param hook 钩子函数 Hook function
     * @returns 构建器实例 Builder instance
     */
    afterExecute(hook: (context: ActivityContext, result: ActivityResult) => Promise<void>): this {
        this.template.afterExecute = hook;
        return this;
    }

    /**
     * 设置模板描述
     * Set template description
     * 
     * @param description 描述 Description
     * @returns 构建器实例 Builder instance
     */
    description(description: string): this {
        this.template.description = description;
        return this;
    }

    /**
     * 设置模板版本
     * Set template version
     * 
     * @param version 版本 Version
     * @returns 构建器实例 Builder instance
     */
    version(version: string): this {
        this.template.version = version;
        return this;
    }

    /**
     * 设置模板ID
     * Set template ID
     * 
     * @param id ID
     * @returns 构建器实例 Builder instance
     */
    id(id: string): this {
        this.template.id = id;
        return this;
    }

    /**
     * 设置模板元数据
     * Set template metadata
     * 
     * @param metadata 元数据 Metadata
     * @returns 构建器实例 Builder instance
     */
    metadata(metadata: Record<string, any>): this {
        this.template.metadata = metadata;
        return this;
    }

    /**
     * 构建模板
     * Build template
     * 
     * @returns 序列工作流模板 Sequence workflow template
     */
    build(): SequenceWorkflowTemplate {
        return this.template;
    }

    /**
     * 创建构建器静态方法
     * Create builder static method
     * 
     * @param name 模板名称 Template name
     * @param options 构建器选项 Builder options
     * @returns 构建器实例 Builder instance
     */
    static create(name: string, options?: WorkflowTemplateBuilderOptions): SequenceWorkflowTemplateBuilder {
        return new SequenceWorkflowTemplateBuilder(name, options);
    }
}

/**
 * 创建序列工作流模板的快捷函数
 * Convenience function to create sequence workflow template
 * 
 * @param name 模板名称 Template name
 * @param activities 活动列表 Activity list
 * @param options 其他选项 Other options
 * @returns 序列工作流模板 Sequence workflow template
 */
export function createSequenceTemplate(
    name: string,
    activities: ActivityTemplateConfig[],
    options?: Partial<SequenceWorkflowTemplate>
): SequenceWorkflowTemplate {
    return {
        name,
        activities,
        ...options
    };
}