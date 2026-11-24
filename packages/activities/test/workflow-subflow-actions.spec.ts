import expect = require('expect');
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import {
    canCreateSubflow,
    createSubflowForNode,
    openReferencedWorkflowTab,
    subflowWorkflowId
} from '../src/visual/workflow-subflow-actions';

describe('Workflow sub-workflow actions', () => {
    let registry: WorkflowNodeRegistry;

    beforeEach(() => {
        registry = new WorkflowNodeRegistry();
    });

    function designer(id = 'workflow_parent'): WorkflowDesigner {
        return new WorkflowDesigner({
            registry,
            definition: {
                id,
                name: 'Parent workflow',
                nodes: [],
                connections: []
            }
        });
    }

    it('recognises only stored ids as referenced workflows', () => {
        const node = (config: Record<string, any>, type: any = 'subprocess') =>
            registry.createNode(type, { x: 0, y: 0 }, { id: 'node_1', config });
        expect(subflowWorkflowId(node({ workflow: 'child-id' }))).toBe('child-id');
        expect(subflowWorkflowId(node({ workflow: '  child_2  ' }))).toBe('child_2');
        // Context paths and inline definitions are resolved at run time, so the
        // editor does not treat them as an openable id.
        expect(subflowWorkflowId(node({ workflow: 'payload.child' }))).toBe('');
        expect(subflowWorkflowId(node({ workflow: '{"id":"inline"}' }))).toBe('');
        expect(subflowWorkflowId(node({}))).toBe('');
        expect(subflowWorkflowId(node({ workflow: 'child-id' }, 'task'))).toBe('');
        expect(subflowWorkflowId(node({ workflow: 'child-id' }, 'loop'))).toBe('child-id');
    });

    it('offers creation only for unbound subflow nodes', () => {
        const subprocess = registry.createNode('subprocess', { x: 0, y: 0 }, { id: 'sub_1' });
        expect(canCreateSubflow(subprocess)).toBe(true);
        expect(canCreateSubflow({ ...subprocess, config: { workflow: 'child' } })).toBe(false);
        expect(canCreateSubflow(registry.createNode('task', { x: 0, y: 0 }, { id: 'task_1' }))).toBe(false);
        expect(canCreateSubflow(undefined)).toBe(false);
    });

    it('registers the parent breadcrumb when a referenced workflow opens', async () => {
        const parent = designer();
        const opened: string[] = [];
        const crumbs: Array<[string, string, string]> = [];
        const host = {
            designer: parent,
            createWorkflowTab: async () => undefined,
            openWorkflowTab: async (id: string) => {
                opened.push(id);
                return true;
            },
            registerSubflowParent: (childId: string, parentId: string, name: string) => {
                crumbs.push([childId, parentId, name]);
            }
        };
        expect(await openReferencedWorkflowTab(host, 'child_a')).toBe('opened');
        expect(opened).toEqual(['child_a']);
        expect(crumbs).toEqual([['child_a', 'workflow_parent', 'Parent workflow']]);

        // Reopening the current document must not create a parent link.
        crumbs.length = 0;
        expect(await openReferencedWorkflowTab(host, 'workflow_parent')).toBe('opened');
        expect(crumbs).toEqual([]);

        const missingHost = { ...host, openWorkflowTab: async () => false };
        expect(await openReferencedWorkflowTab(missingHost, 'gone')).toBe('missing');
    });

    it('creates a child document and binds the node to it', async () => {
        const parent = designer();
        const node = parent.addNode('subprocess', { x: 40, y: 40 })!;
        const child = designer('workflow_child');
        const crumbs: Array<[string, string, string]> = [];
        const host = {
            designer: parent,
            createWorkflowTab: async () => {
                // The component switches the active designer to the new tab.
                host.designer = child;
                return child.definition.id;
            },
            openWorkflowTab: async () => true,
            registerSubflowParent: (childId: string, parentId: string, name: string) => {
                crumbs.push([childId, parentId, name]);
            }
        };
        const created = await createSubflowForNode(host, node.id, 'subflow');
        expect(created).toBe('workflow_child');
        expect(child.definition.name).toBe(`${node.name} subflow`);
        expect(parent.nodes.find(item => item.id === node.id)?.config?.workflow).toBe('workflow_child');
        expect(crumbs).toEqual([['workflow_child', 'workflow_parent', 'Parent workflow']]);
    });

    it('ignores nodes that are not sub workflows and tabs that did not open', async () => {
        const parent = designer();
        const task = parent.addNode('task', { x: 0, y: 0 })!;
        const host = {
            designer: parent,
            createWorkflowTab: async () => 'workflow_child',
            openWorkflowTab: async () => true,
            registerSubflowParent: () => undefined
        };
        expect(await createSubflowForNode(host, task.id, 'subflow')).toBeUndefined();

        const sub = parent.addNode('subprocess', { x: 0, y: 0 })!;
        const noTab = {
            ...host,
            createWorkflowTab: async () => undefined
        };
        expect(await createSubflowForNode(noTab, sub.id, 'subflow')).toBeUndefined();
        // The same designer means the host did not switch tabs.
        expect(await createSubflowForNode(host, sub.id, 'subflow')).toBeUndefined();
    });
});
