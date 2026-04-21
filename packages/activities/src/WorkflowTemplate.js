"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequenceWorkflowTemplateBuilder = void 0;
exports.createSequenceTemplate = createSequenceTemplate;
/**
 * 序列工作流模板构建器
 * Sequence workflow template builder
 *
 * 用于方便地创建序列工作流模板
 * Used to conveniently create sequence workflow templates
 */
class SequenceWorkflowTemplateBuilder {
    constructor(name, options) {
        this.activityIndex = 0;
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
    addActivity(type, config) {
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
    addActivities(activities) {
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
    continueOnError(continueOnError) {
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
    onError(handler) {
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
    beforeExecute(hook) {
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
    afterExecute(hook) {
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
    description(description) {
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
    version(version) {
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
    id(id) {
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
    metadata(metadata) {
        this.template.metadata = metadata;
        return this;
    }
    /**
     * 构建模板
     * Build template
     *
     * @returns 序列工作流模板 Sequence workflow template
     */
    build() {
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
    static create(name, options) {
        return new SequenceWorkflowTemplateBuilder(name, options);
    }
}
exports.SequenceWorkflowTemplateBuilder = SequenceWorkflowTemplateBuilder;
/**
 * 创建序列工作流模板的快捷函数
 * Convenience function to create sequence workflow template
 *
 * @param name 模板名称 Template name
 * @param activities 活动列表 Activity list
 * @param options 其他选项 Other options
 * @returns 序列工作流模板 Sequence workflow template
 */
function createSequenceTemplate(name, activities, options) {
    return {
        name,
        activities,
        ...options
    };
}
//# sourceMappingURL=WorkflowTemplate.js.map