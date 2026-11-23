import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import {
    isCredentialReference,
    migrateInlineSecrets,
    secretCredentialName
} from '../src/visual/workflow-secrets';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Inline secret migration', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
    });

    function definition(): VisualWorkflowDefinition {
        return {
            id: 'workflow_secret',
            name: 'Secret migration',
            nodes: [
                registry.createNode('mqtt-out', { x: 0, y: 0 }, {
                    id: 'mqtt_out',
                    config: {
                        topic: 'sensors/temp',
                        password: 'hunter2',
                        username: 'ada'
                    }
                }),
                registry.createNode('tls', { x: 0, y: 120 }, {
                    id: 'tls_1',
                    config: {
                        cert: 'inline-cert',
                        key: 'inline-key',
                        servername: 'broker.example.com'
                    }
                })
            ],
            connections: []
        };
    }

    it('moves raw secrets into the store and keeps other config', async () => {
        const stored: Array<[string, string]> = [];
        const result = await migrateInlineSecrets(definition(), registry, async (name, value) => {
            stored.push([name, value]);
        });

        expect(result.failed).toEqual([]);
        expect(result.migrated.map(item => item.field)).toEqual(['password', 'cert', 'key']);
        expect(stored).toEqual([
            ['workflow_secret.mqtt_out.password', 'hunter2'],
            ['workflow_secret.tls_1.cert', 'inline-cert'],
            ['workflow_secret.tls_1.key', 'inline-key']
        ]);

        const mqtt = result.definition.nodes.find(node => node.id === 'mqtt_out')!;
        expect(mqtt.config?.password).toBe('{{credential:workflow_secret.mqtt_out.password}}');
        expect(mqtt.config?.username).toBe('ada');
        expect(mqtt.config?.topic).toBe('sensors/temp');
        const tls = result.definition.nodes.find(node => node.id === 'tls_1')!;
        expect(tls.config?.cert).toBe('{{credential:workflow_secret.tls_1.cert}}');
        expect(tls.config?.servername).toBe('broker.example.com');
        // The input document is not mutated.
        expect(definition().nodes[0].config?.password).toBe('hunter2');
    });

    it('is idempotent and leaves references, empty values and non-secret fields alone', async () => {
        const calls: string[] = [];
        const already = definition();
        already.nodes[0].config = {
            ...already.nodes[0].config,
            password: '{{credential:shared}}'
        };
        already.nodes[1].config = { ...already.nodes[1].config, key: '', cert: '   ' };

        const result = await migrateInlineSecrets(already, registry, async name => {
            calls.push(name);
        });
        expect(calls).toEqual([]);
        expect(result.migrated).toEqual([]);
        expect(result.definition).toBe(already);

        const store = new Map<string, string>();
        await migrateInlineSecrets(definition(), registry, async (name, value) => {
            store.set(name, value);
        });
        const second = await migrateInlineSecrets(definition(), registry, async (name, value) => {
            store.set(name, value);
        });
        // Different input objects, so the second run migrates again but the
        // stored names are stable.
        expect(second.migrated.map(item => item.name)).toEqual([
            'workflow_secret.mqtt_out.password',
            'workflow_secret.tls_1.cert',
            'workflow_secret.tls_1.key'
        ]);
        expect(secretCredentialName('wf id/x', 'node:1', 'key')).toBe('wf-id-x.node-1.key');
    });

    it('keeps the raw value when the store rejects it', async () => {
        const result = await migrateInlineSecrets(definition(), registry, async name => {
            if (name.includes('tls_1')) {
                throw new Error('store offline');
            }
        });
        expect(result.migrated.map(item => item.field)).toEqual(['password']);
        expect(result.failed.length).toBe(2);
        expect(result.failed[0].error).toBe('store offline');
        const tls = result.definition.nodes.find(node => node.id === 'tls_1')!;
        expect(tls.config?.cert).toBe('inline-cert');
        expect(tls.config?.key).toBe('inline-key');
    });

    describe('designer writes', () => {
        function storeFixture(definitionValue: VisualWorkflowDefinition) {
            const saved: VisualWorkflowDefinition[] = [];
            const credentials = new Map<string, string>();
            const store: any = {
                save: async (next: VisualWorkflowDefinition) => {
                    saved.push(next);
                    return {
                        id: next.id,
                        name: next.name,
                        description: next.description,
                        nodeCount: next.nodes.length,
                        connectionCount: next.connections.length,
                        updatedAt: new Date().toISOString()
                    };
                },
                saveVersion: async (next: VisualWorkflowDefinition) => {
                    saved.push(next);
                    return {
                        version: 1,
                        createdAt: new Date().toISOString(),
                        id: next.id,
                        name: next.name,
                        description: next.description,
                        nodeCount: next.nodes.length,
                        connectionCount: next.connections.length,
                        updatedAt: new Date().toISOString(),
                        workflowId: next.id
                    };
                },
                setCredential: async (name: string, value: string) => {
                    credentials.set(name, value);
                }
            };
            return { store, saved, credentials, definitionValue };
        }

        it('migrates before saving and adopts the references in the editor', async () => {
            const fixture = storeFixture(definition());
            const designer = new WorkflowDesigner({
                definition: fixture.definitionValue,
                registry
            });
            await designer.saveTo(fixture.store, { version: true });

            expect(fixture.credentials.get('workflow_secret.mqtt_out.password')).toBe('hunter2');
            expect(fixture.saved.length).toBe(1);
            expect(fixture.saved[0].nodes.find(node => node.id === 'mqtt_out')?.config?.password)
                .toBe('{{credential:workflow_secret.mqtt_out.password}}');
            // The open document now holds the references too.
            expect(designer.definition.nodes.find(node => node.id === 'mqtt_out')?.config?.password)
                .toBe('{{credential:workflow_secret.mqtt_out.password}}');
            expect(designer.validate().warnings).toEqual([]);

            // A second save is a no-op: snapshot matches and no new credential write.
            await designer.saveTo(fixture.store, {});
            expect(fixture.saved.length).toBe(1);
        });

        it('migrates before publishing so the release carries references', async () => {
            const fixture = storeFixture(definition());
            const releases: VisualWorkflowDefinition[] = [];
            fixture.store.publish = async (next: VisualWorkflowDefinition) => {
                releases.push(next);
                return {
                    release: { version: 4, workflowId: next.id },
                    definition: next
                };
            };
            const designer = new WorkflowDesigner({
                definition: fixture.definitionValue,
                registry
            });
            const release = await designer.publishTo(fixture.store);
            expect(release?.version).toBe(4);
            expect(releases.length).toBe(1);
            expect(releases[0].nodes.find(node => node.id === 'mqtt_out')?.config?.password)
                .toBe('{{credential:workflow_secret.mqtt_out.password}}');
            expect(designer.message).toBe('workflow.message.published');
            expect(designer.lastSecretMigration?.migrated.length).toBe(3);
        });

        it('leaves documents alone when the host has no credential store', async () => {
            const fixture = storeFixture(definition());
            delete fixture.store.setCredential;
            const designer = new WorkflowDesigner({
                definition: fixture.definitionValue,
                registry
            });
            await designer.saveTo(fixture.store, {});
            expect(fixture.saved[0].nodes[0].config?.password).toBe('hunter2');
            expect(designer.validate().warnings.length).toBe(3);
        });
    });

    it('recognises stored reference forms', () => {
        expect(isCredentialReference('{{credential:api-token}}')).toBe(true);
        expect(isCredentialReference('credential:api-token')).toBe(true);
        expect(isCredentialReference('hunter2')).toBe(false);
        expect(isCredentialReference('{{credential: }}')).toBe(false);
    });
});
