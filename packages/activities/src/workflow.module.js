"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("@tsdi/aop");
const components_1 = require("@tsdi/components");
const RunAspect_1 = require("./aop/RunAspect");
const aop_2 = require("./aop");
const workflow_service_1 = require("./services/workflow.service");
const activities_1 = require("./activities");
const visual_1 = require("./visual");
/**
 * setup wokflow activity module for application.
 *
 * @export
 */
let WorkflowModule = class WorkflowModule {
};
exports.WorkflowModule = WorkflowModule;
exports.WorkflowModule = WorkflowModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        imports: [
            aop_1.AopModule,
            components_1.ComponentsModule
        ],
        providers: [
            workflow_service_1.WorkflowService,
            RunAspect_1.RunAspect,
            aop_2.ActivityInterceptorService,
            aop_2.ActivityLogAspect,
            aop_2.ActivityDebugService,
            visual_1.VisualWorkflowService,
            visual_1.VisualWorkflowBuilder
        ],
        declarations: [
            activities_1.StartActivity,
            activities_1.EndActivity,
            activities_1.ConfirmActivity,
            activities_1.DelayActivity,
            activities_1.WhileActivity,
            activities_1.DoWhileActivity,
            activities_1.IntervalActivity,
            activities_1.InvokeActivity,
            activities_1.ParallelActivity,
            activities_1.SequenceActivity,
            activities_1.ThrowActivity,
            activities_1.TimerActivity,
            activities_1.TryCatchActivity,
            activities_1.AssignActivity,
            activities_1.LogActivity,
            activities_1.ForEachActivity,
            activities_1.TransformActivity,
            activities_1.MapActivity,
            activities_1.FilterActivity,
            activities_1.ReduceActivity,
            activities_1.ValidateActivity,
            activities_1.RequiredActivity,
            activities_1.RangeActivity,
            activities_1.PatternActivity,
            activities_1.EmitActivity,
            activities_1.WaitActivity,
            activities_1.BatchActivity,
            activities_1.MergeActivity,
            activities_1.SplitActivity,
            activities_1.CodeActivity,
            activities_1.SubProcessActivity,
            activities_1.HttpRequestActivity
        ],
        exports: [
            aop_1.AopModule,
            components_1.ComponentsModule,
            activities_1.StartActivity,
            activities_1.EndActivity,
            activities_1.ConfirmActivity,
            activities_1.DelayActivity,
            activities_1.WhileActivity,
            activities_1.DoWhileActivity,
            activities_1.IntervalActivity,
            activities_1.InvokeActivity,
            activities_1.ParallelActivity,
            activities_1.SequenceActivity,
            activities_1.ThrowActivity,
            activities_1.TimerActivity,
            activities_1.TryCatchActivity,
            activities_1.AssignActivity,
            activities_1.LogActivity,
            activities_1.ForEachActivity,
            activities_1.TransformActivity,
            activities_1.MapActivity,
            activities_1.FilterActivity,
            activities_1.ReduceActivity,
            activities_1.ValidateActivity,
            activities_1.RequiredActivity,
            activities_1.RangeActivity,
            activities_1.PatternActivity,
            activities_1.EmitActivity,
            activities_1.WaitActivity,
            activities_1.BatchActivity,
            activities_1.MergeActivity,
            activities_1.SplitActivity,
            activities_1.CodeActivity,
            activities_1.SubProcessActivity,
            activities_1.HttpRequestActivity,
            visual_1.VisualWorkflowService,
            visual_1.VisualWorkflowBuilder,
            aop_2.ActivityInterceptorService,
            aop_2.ActivityLogAspect,
            aop_2.ActivityDebugService
        ]
    })
], WorkflowModule);
//# sourceMappingURL=workflow.module.js.map