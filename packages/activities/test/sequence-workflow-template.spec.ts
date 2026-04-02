import expect = require('expect');
import { 
    Workflow, 
    SequenceWorkflowTemplate, 
    SequenceWorkflowTemplateBuilder,
    createSequenceTemplate,
    WorkflowTemplateResult,
    ActivityTemplateConfig
} from '../src';
import { 
    Activity, 
    ActivityContext, 
    ActivityResult,
    StartActivity,
    EndActivity,
    SequenceActivity,
    DelayActivity,
    LogActivity,
    AssignActivity
} from '../src/activities';

describe('Sequence Workflow Template Startup', () => {

    describe('SequenceWorkflowTemplateBuilder', () => {
        
        it('should create a template with builder', () => {
            const template = SequenceWorkflowTemplateBuilder
                .create('Test Workflow')
                .id('test-001')
                .description('A test workflow template')
                .version('1.0.0')
                .build();

            expect(template.name).toBe('Test Workflow');
            expect(template.id).toBe('test-001');
            expect(template.description).toBe('A test workflow template');
            expect(template.version).toBe('1.0.0');
            expect(template.activities).toEqual([]);
        });

it('should add activities to template', () => {
            const template = SequenceWorkflowTemplateBuilder
                .create('Multi-Activity Workflow')
                .addActivity(StartActivity)
                .addActivity(DelayActivity, { duration: 100 })
                .addActivity(EndActivity)
                .build();

            expect(template.activities.length).toBe(3);
            expect(template.activities[0].type).toBe(StartActivity);
            expect(template.activities[1].config?.duration).toBe(100);
            expect(template.activities[2].type).toBe(EndActivity);
        });

        it('should add multiple activities at once', () => {
            const activities: ActivityTemplateConfig[] = [
                { type: StartActivity, name: 'start' },
                { type: EndActivity, name: 'end' }
            ];

            const template = SequenceWorkflowTemplateBuilder
                .create('Batch Add Workflow')
                .addActivities(activities)
                .build();

            expect(template.activities.length).toBe(2);
            expect(template.activities[0].name).toBe('start');
            expect(template.activities[1].name).toBe('end');
        });

        it('should set continue on error', () => {
            const template = SequenceWorkflowTemplateBuilder
                .create('Error Handling Workflow')
                .continueOnError(true)
                .build();

            expect(template.continueOnError).toBe(true);
        });

        it('should set error handler', () => {
            const errorHandler = async (error: Error) => ({ success: true });
            
            const template = SequenceWorkflowTemplateBuilder
                .create('Error Handler Workflow')
                .onError(errorHandler)
                .build();

            expect(template.onError).toBe(errorHandler);
        });

        it('should set before and after hooks', () => {
            const beforeHook = async (ctx: ActivityContext) => {};
            const afterHook = async (ctx: ActivityContext, result: ActivityResult) => {};

            const template = SequenceWorkflowTemplateBuilder
                .create('Hooks Workflow')
                .beforeExecute(beforeHook)
                .afterExecute(afterHook)
                .build();

            expect(template.beforeExecute).toBe(beforeHook);
            expect(template.afterExecute).toBe(afterHook);
        });

        it('should set metadata', () => {
            const template = SequenceWorkflowTemplateBuilder
                .create('Metadata Workflow')
                .metadata({ author: 'test', tags: ['unit', 'test'] })
                .build();

            expect(template.metadata?.author).toBe('test');
            expect(template.metadata?.tags).toEqual(['unit', 'test']);
        });

        it('should auto-generate ID when configured', () => {
            const template = SequenceWorkflowTemplateBuilder
                .create('Auto ID Workflow', { autoId: true, idPrefix: 'auto' })
                .build();

            expect(template.id).toBeDefined();
            expect(template.id?.startsWith('auto_')).toBe(true);
        });
    });

    describe('createSequenceTemplate helper', () => {
        
        it('should create template with helper function', () => {
            const template = createSequenceTemplate(
                'Simple Workflow',
                [
                    { type: StartActivity },
                    { type: EndActivity }
                ]
            );

            expect(template.name).toBe('Simple Workflow');
            expect(template.activities.length).toBe(2);
        });

        it('should create template with options', () => {
            const template = createSequenceTemplate(
                'Options Workflow',
                [{ type: StartActivity }],
                {
                    id: 'opt-001',
                    description: 'With options',
                    continueOnError: true
                }
            );

            expect(template.id).toBe('opt-001');
            expect(template.description).toBe('With options');
            expect(template.continueOnError).toBe(true);
        });
    });

    describe('Workflow.runSequence', () => {
        
        it('should execute simple sequence template', async () => {
            const template: SequenceWorkflowTemplate = {
                name: 'Simple Sequence',
                activities: [
                    { type: StartActivity },
                    { type: EndActivity }
                ]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
            expect(result.templateId).toBeUndefined();
            expect(result.executionId).toBeDefined();
            expect(result.executionTime).toBeGreaterThanOrEqual(0);
        });

        it('should execute template with activities', async () => {
            const template: SequenceWorkflowTemplate = {
                name: 'Activity Sequence',
                activities: [
                    { 
                        type: DelayActivity,
                        config: { duration: 50 }
                    },
                    {
                        type: AssignActivity,
                        config: { values: { status: 'completed' } }
                    }
                ]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
        });

        it('should skip disabled activities', async () => {
            const executionOrder: string[] = [];

            class TestActivity1 extends Activity {
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    executionOrder.push('activity1');
                    return { success: true };
                }
            }

            class TestActivity2 extends Activity {
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    executionOrder.push('activity2');
                    return { success: true };
                }
            }

            const template: SequenceWorkflowTemplate = {
                name: 'Skip Disabled',
                activities: [
                    { type: TestActivity1, name: 'first' },
                    { type: TestActivity2, name: 'second', enabled: false },
                    { type: TestActivity1, name: 'third' }
                ]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
            expect(executionOrder).toEqual(['activity1', 'activity1']);
        });

        it('should execute with context', async () => {
            const template: SequenceWorkflowTemplate = {
                name: 'Context Test',
                activities: [
                    { 
                        type: AssignActivity,
                        config: { values: { testKey: 'testValue' } }
                    }
                ]
            };

            const context: any = { variables: {} };
            const result = await Workflow.runSequence(template, { context });

            expect(result.success).toBe(true);
        });

        it('should call beforeExecute hook', async () => {
            let hookCalled = false;

            const template: SequenceWorkflowTemplate = {
                name: 'Before Hook',
                activities: [{ type: StartActivity }],
                beforeExecute: async (ctx) => {
                    hookCalled = true;
                }
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
            expect(hookCalled).toBe(true);
        });

        it('should call afterExecute hook', async () => {
            let hookCalled = false;
            let capturedResult: ActivityResult | undefined;

            const template: SequenceWorkflowTemplate = {
                name: 'After Hook',
                activities: [{ type: StartActivity }],
                afterExecute: async (ctx, result) => {
                    hookCalled = true;
                    capturedResult = result;
                }
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
            expect(hookCalled).toBe(true);
            expect(capturedResult).toBeDefined();
        });

        it('should handle errors in activities', async () => {
            class ErrorActivity extends Activity {
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    throw new Error('Test error');
                }
            }

            const template: SequenceWorkflowTemplate = {
                name: 'Error Workflow',
                activities: [{ type: ErrorActivity }]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.message).toContain('Test error');
        });

        it('should continue on error when configured', async () => {
            const executed: string[] = [];

            class SuccessActivity extends Activity {
                constructor(private name: string) {
                    super();
                }
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    executed.push(this.name);
                    return { success: true };
                }
            }

            class FailActivity extends Activity {
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    executed.push('fail');
                    return { success: false, error: new Error('Failed') };
                }
            }

            const template: SequenceWorkflowTemplate = {
                name: 'Continue On Error',
                continueOnError: true,
                activities: [
                    { type: SuccessActivity, config: { name: 'first' } },
                    { type: FailActivity },
                    { type: SuccessActivity, config: { name: 'last' } }
                ]
            };

            const result = await Workflow.runSequence(template);

            expect(executed.length).toBe(3);
            expect(executed).toContain('first');
            expect(executed).toContain('fail');
            expect(executed).toContain('last');
        });

        it('should use custom error handler', async () => {
            let errorHandlerCalled = false;

            class ErrorActivity extends Activity {
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    throw new Error('Custom error');
                }
            }

            const template: SequenceWorkflowTemplate = {
                name: 'Error Handler',
                activities: [{ type: ErrorActivity }],
                onError: async (error) => {
                    errorHandlerCalled = true;
                    return { success: true, data: { handled: true } };
                }
            };

            const result = await Workflow.runSequence(template);

            expect(errorHandlerCalled).toBe(true);
        });

        it('should track execution time', async () => {
            const template: SequenceWorkflowTemplate = {
                name: 'Timing Test',
                activities: [
                    { type: DelayActivity, config: { duration: 50 } }
                ]
            };

            const startTime = Date.now();
            const result = await Workflow.runSequence(template);
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.executionTime).toBeGreaterThanOrEqual(40);
            expect(result.executionTime).toBeLessThanOrEqual(endTime - startTime + 50);
        });

        it('should return template ID when provided', async () => {
            const template: SequenceWorkflowTemplate = {
                id: 'template-123',
                name: 'ID Test',
                activities: [{ type: StartActivity }]
            };

            const result = await Workflow.runSequence(template);

            expect(result.templateId).toBe('template-123');
        });
    });

    describe('Complex Workflow Templates', () => {
        
        it('should execute data processing pipeline', async () => {
            const template = SequenceWorkflowTemplateBuilder
                .create('Data Pipeline')
                .id('pipeline-001')
                .description('Data processing pipeline')
                .addActivity(StartActivity)
                .addActivities([
                    { type: AssignActivity, config: { values: { step: 1 } } },
                    { type: LogActivity, config: { message: 'Processing data' } },
                    { type: AssignActivity, config: { values: { step: 2 } } }
                ])
                .addActivity(EndActivity)
                .build();

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
            expect(result.templateId).toBe('pipeline-001');
        });

        it('should execute workflow with conditional activities', async () => {
            class ConditionalActivity extends Activity {
                condition?: boolean;
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    if (this.condition === false) {
                        return { success: false, error: new Error('Condition not met') };
                    }
                    return { success: true, data: { executed: true } };
                }
            }

            const template: SequenceWorkflowTemplate = {
                name: 'Conditional Flow',
                activities: [
                    { type: StartActivity },
                    { type: ConditionalActivity, config: { condition: true } },
                    { type: EndActivity }
                ]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
        });

        it('should handle long running workflow', async () => {
            const template = SequenceWorkflowTemplateBuilder
                .create('Long Running')
                .addActivity(StartActivity)
                .addActivities([
                    { type: DelayActivity, config: { duration: 20 } },
                    { type: DelayActivity, config: { duration: 20 } },
                    { type: DelayActivity, config: { duration: 20 } }
                ])
                .addActivity(EndActivity)
                .build();

            const startTime = Date.now();
            const result = await Workflow.runSequence(template);
            const executionTime = Date.now() - startTime;

            expect(result.success).toBe(true);
            expect(executionTime).toBeGreaterThanOrEqual(50);
        });

        it('should support activity template metadata', async () => {
            const template: SequenceWorkflowTemplate = {
                name: 'Metadata Test',
                activities: [
                    { 
                        type: StartActivity,
                        name: 'custom-start',
                        description: 'Custom start activity'
                    }
                ],
                metadata: {
                    author: 'test-author',
                    version: '1.0',
                    environment: 'test'
                }
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        
        it('should handle empty activities list', async () => {
            const template: SequenceWorkflowTemplate = {
                name: 'Empty Workflow',
                activities: []
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
            expect(result.data?.completed).toBe(true);
        });

        it('should handle activity with no config', async () => {
            const template: SequenceWorkflowTemplate = {
                name: 'No Config',
                activities: [
                    { type: StartActivity },
                    { type: EndActivity }
                ]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(true);
        });

        it('should handle activity returning error', async () => {
            class FailActivity extends Activity {
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    return { success: false, error: new Error('Planned failure') };
                }
            }

            const template: SequenceWorkflowTemplate = {
                name: 'Planned Failure',
                activities: [{ type: FailActivity }]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Planned failure');
        });

        it('should handle multiple errors in sequence', async () => {
            class ErrorActivity extends Activity {
                constructor(private msg: string) {
                    super();
                }
                async execute(context: ActivityContext): Promise<ActivityResult> {
                    return { success: false, error: new Error(this.msg) };
                }
            }

            const template: SequenceWorkflowTemplate = {
                name: 'Multiple Errors',
                continueOnError: true,
                activities: [
                    { type: ErrorActivity, config: { msg: 'Error 1' } },
                    { type: ErrorActivity, config: { msg: 'Error 2' } },
                    { type: ErrorActivity, config: { msg: 'Error 3' } }
                ]
            };

            const result = await Workflow.runSequence(template);

            expect(result.success).toBe(false);
        });
    });
});