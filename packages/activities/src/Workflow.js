"use strict";
var Workflow_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workflow = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const components_1 = require("@tsdi/components");
const workflow_module_1 = require("./workflow.module");
const activities_1 = require("./activities");
let Workflow = Workflow_1 = class Workflow {
    /**
     * Run sequence workflow from template
     * 从模板运行顺序工作流
     *
     * @param template Sequence workflow template
     * @param options Workflow options
     * @returns Execution result
     */
    static async runSequence(template, options) {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        const activityResults = new Map();
        try {
            const activities = await Workflow_1.createActivitiesFromTemplate(template);
            const sequenceActivity = new activities_1.SequenceActivity();
            sequenceActivity.activities = activities;
            sequenceActivity.continueOnError = template.continueOnError;
            sequenceActivity.onError = template.onError;
            const context = options?.context || {};
            if (template.beforeExecute) {
                await template.beforeExecute(context);
            }
            const result = await sequenceActivity.execute(context);
            result.data?.results?.forEach((value, key) => {
                activityResults.set(key.constructor?.name || 'unknown', value);
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
        }
        catch (error) {
            const endTime = Date.now();
            return {
                success: false,
                error: error,
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
    static async runSequenceWithContext(template, options) {
        const activities = await Workflow_1.createActivitiesFromTemplate(template);
        const sequenceActivity = new activities_1.SequenceActivity();
        sequenceActivity.activities = activities;
        sequenceActivity.continueOnError = template.continueOnError;
        sequenceActivity.onError = template.onError;
        return Workflow_1.run(activities_1.SequenceActivity, {
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
    static async createActivitiesFromTemplate(template) {
        const activities = [];
        for (const activityConfig of template.activities) {
            if (activityConfig.enabled === false) {
                continue;
            }
            const activity = await Workflow_1.createActivityFromConfig(activityConfig);
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
    static async createActivityFromConfig(config) {
        try {
            const ActivityClass = config.type;
            const activity = new ActivityClass();
            if (config.config) {
                Object.assign(activity, config.config);
            }
            return activity;
        }
        catch (error) {
            console.error(`Failed to create activity from config:`, error);
            return null;
        }
    }
    static run(module, options) {
        return (0, components_1.bootstrapComponent)(module, {
            ...options,
            deps: [workflow_module_1.WorkflowModule, ...(options?.deps || [])]
        });
    }
};
exports.Workflow = Workflow;
exports.Workflow = Workflow = Workflow_1 = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], Workflow);
//# sourceMappingURL=Workflow.js.map