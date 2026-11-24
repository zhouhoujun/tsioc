import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { validateWorkflowConfigs } from '../src/visual/workflow-config-validation';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow config validation hooks', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
    });

    function definition(nodes: any[]): VisualWorkflowDefinition {
        return { id: 'validation-hooks', name: 'Validation hooks', nodes, connections: [] };
    }

    function node(type: any, config: Record<string, any>, id: string): any {
        return registry.createNode(type, { x: 0, y: 0 }, { id, config });
    }

    it('reports a switch without rules instead of silently routing nowhere', () => {
        const target = node('switch', { field: 'value', rules: [] }, 'switch_empty');
        const issues = validateWorkflowConfigs(definition([target]), registry);
        expect(issues.some(item => item.nodeId === target.id
            && item.fieldKey === 'rules'
            && /at least one rule/.test(item.message))).toBe(true);
    });

    it('keeps the else rule single and last', () => {
        const duplicate = node('switch', {
            field: 'value',
            rules: [{ operator: 'else' }, { operator: 'else' }]
        }, 'switch_duplicate');
        const notLast = node('switch', {
            field: 'value',
            rules: [{ operator: 'else' }, { operator: 'equals', value: '1' }]
        }, 'switch_not_last');

        const duplicateIssues = validateWorkflowConfigs(definition([duplicate]), registry);
        expect(duplicateIssues.some(item => /Only one "else" rule/.test(item.message))).toBe(true);

        const trailingIssues = validateWorkflowConfigs(definition([notLast]), registry);
        expect(trailingIssues.some(item => /must be the last rule/.test(item.message))).toBe(true);

        const valid = node('switch', {
            field: 'value',
            rules: [{ operator: 'equals', value: '1' }, { operator: 'else' }]
        }, 'switch_valid');
        expect(validateWorkflowConfigs(definition([valid]), registry)).toEqual([]);
    });

    it('runs field-level cross-field hooks', () => {
        const missingVariable = node('inject', {
            payloadType: 'env',
            payloadValue: '   '
        }, 'inject_env');
        const issues = validateWorkflowConfigs(definition([missingVariable]), registry);
        expect(issues.some(item => item.fieldKey === 'payloadValue'
            && /environment variable/.test(item.message))).toBe(true);

        const named = node('inject', {
            payloadType: 'env',
            payloadValue: 'REGION'
        }, 'inject_env_named');
        expect(validateWorkflowConfigs(definition([named]), registry)).toEqual([]);

        const unnamedEvent = node('inject', { trigger: 'event', event: '' }, 'inject_event');
        expect(validateWorkflowConfigs(definition([unnamedEvent]), registry)
            .some(item => item.fieldKey === 'event' && /event this inject waits for/.test(item.message))).toBe(true);
    });

    it('requires an expression for the inject expression payload', () => {
        const empty = node('inject', {
            payloadType: 'expression',
            payloadExpression: '  '
        }, 'inject_expression_empty');
        const issues = validateWorkflowConfigs(definition([empty]), registry);
        expect(issues.some(item => item.fieldKey === 'payloadExpression')).toBe(true);

        const filled = node('inject', {
            payloadType: 'expression',
            payloadExpression: 'payload.total * 2'
        }, 'inject_expression_filled');
        expect(validateWorkflowConfigs(definition([filled]), registry)).toEqual([]);
    });

    it('validates list item hooks through their own context', () => {
        registry.register({
            type: 'hook-test',
            label: 'Hook test',
            category: 'advanced',
            icon: '◆',
            color: '#64748b',
            inputs: [],
            outputs: [],
            fields: [
                {
                    key: 'entries',
                    label: 'Entries',
                    type: 'list',
                    itemFields: [
                        { key: 'key', label: 'Key', type: 'text' },
                        {
                            key: 'value',
                            label: 'Value',
                            type: 'text',
                            validate: (value: any, { values }: any) =>
                                values.key && !String(value ?? '').trim()
                                    ? `Value for ${values.key} is required.`
                                    : undefined
                        }
                    ]
                }
            ],
            defaultConfig: { entries: [] }
        } as any);

        const target = node('hook-test', {
            entries: [{ key: 'region', value: '' }]
        }, 'hook_test');
        const issues = validateWorkflowConfigs(definition([target]), registry);
        const issue = issues.find(item => item.fieldKey === 'entries[0].value')!;
        expect(issue).toBeTruthy();
        expect(issue.message).toContain('Value for region is required.');
        expect(issue.label).toContain('Entries 1');

        const filled = node('hook-test', {
            entries: [{ key: 'region', value: 'eu' }]
        }, 'hook_test_filled');
        expect(validateWorkflowConfigs(definition([filled]), registry)).toEqual([]);
    });
});

describe('Workflow credential references', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
    });

    function definition(config: Record<string, any>): VisualWorkflowDefinition {
        return {
            id: 'credential-validation',
            name: 'Credential validation',
            nodes: [registry.createNode('mqtt-out', { x: 0, y: 0 }, { id: 'mqtt_out', config })],
            connections: []
        };
    }

    it('accepts references the host store exposes', () => {
        const issues = validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: '{{credential:api-token}}' }),
            registry,
            { credentials: ['api-token'] }
        );
        expect(issues).toEqual([]);
    });

    it('reports references the host store does not have', () => {
        const issues = validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: '{{credential:missing}}' }),
            registry,
            { credentials: ['api-token'] }
        );
        const issue = issues.find(item => item.fieldKey === 'password')!;
        expect(issue).toBeTruthy();
        expect(issue.message).toContain('Credential not found: missing');
    });

    it('reports malformed references and empty stores', () => {
        const malformed = validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: '{{credential: }}' }),
            registry,
            { credentials: ['api-token'] }
        );
        expect(malformed.some(item => item.fieldKey === 'password'
            && /needs a name/.test(item.message))).toBe(true);

        const empty = validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: 'credential:api-token' }),
            registry,
            { credentials: [] }
        );
        expect(empty.some(item => /Credential not found: api-token/.test(item.message))).toBe(true);
    });

    it('skips name checks when the host has no credential store', () => {
        const issues = validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: '{{credential:anything}}' }),
            registry
        );
        expect(issues).toEqual([]);
    });

    it('validates designer publishing against the loaded names', () => {
        const designer = new WorkflowDesigner({
            definition: definition({ topic: 'sensors/temp', password: '{{credential:api-token}}' }),
            registry
        });
        expect(designer.validate().valid).toBe(true);

        designer.setCredentialNames(['other-token']);
        const errors = designer.validate().errors.join(' ');
        expect(errors).toContain('Credential not found: api-token');

        designer.setCredentialNames(['api-token', 'other-token', 'api-token']);
        expect(designer.credentialNames).toEqual(['api-token', 'other-token']);
        expect(designer.validate().valid).toBe(true);
    });
});

describe('Workflow inline secret warnings', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
    });

    function definition(config: Record<string, any>): VisualWorkflowDefinition {
        return {
            id: 'secret-warning',
            name: 'Secret warning',
            nodes: [registry.createNode('mqtt-out', { x: 0, y: 0 }, { id: 'mqtt_out', config })],
            connections: []
        };
    }

    it('warns when a secret field stores a raw value', () => {
        const issues = validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: 'hunter2' }),
            registry
        );
        const warning = issues.find(item => item.fieldKey === 'password')!;
        expect(warning).toBeTruthy();
        expect(warning.severity).toBe('warning');
        expect(warning.message).toContain('credential store');
    });

    it('stays quiet for credential references and for ordinary fields', () => {
        expect(validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: '{{credential:mqtt-pass}}' }),
            registry
        )).toEqual([]);
        expect(validateWorkflowConfigs(
            definition({ topic: 'sensors/temp', password: '' }),
            registry
        )).toEqual([]);
    });

    it('reports warnings without failing validation and records them on publish', async () => {
        const designer = new WorkflowDesigner({
            definition: definition({ topic: 'sensors/temp', password: 'hunter2' }),
            registry
        });
        const validation = designer.validate();
        expect(validation.valid).toBe(true);
        expect(validation.errors).toEqual([]);
        expect(validation.warnings.length).toBe(1);
        expect(validation.warnings[0]).toContain('credential store');

        const releases: any[] = [];
        const store: any = {
            publish: async (definition: VisualWorkflowDefinition, options: any) => {
                releases.push({ definition, options });
                return {
                    release: { version: 3, workflowId: definition.id },
                    definition
                };
            }
        };
        const release = await designer.publishTo(store, { publishedBy: 'tester' });
        expect(release?.version).toBe(3);
        expect(releases.length).toBe(1);
        expect(designer.message).toBe('workflow.message.publishedWithWarnings');
        expect(designer.messageParams.count).toBe(1);
    });
});
