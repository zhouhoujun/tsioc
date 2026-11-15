import expect = require('expect');
import { diffWorkflowDefinitions, describeWorkflowDiff } from '../src/visual/workflow-diff';
import { VisualWorkflowDefinition } from '../src/visual/types';

function definition(patch: Partial<VisualWorkflowDefinition> = {}): VisualWorkflowDefinition {
    return {
        id: 'wf',
        name: 'Demo',
        nodes: [
            {
                id: 'start_1', name: 'Start', type: 'start', position: { x: 0, y: 0 },
                config: { payload: 'one' }
            } as any,
            { id: 'end_1', name: 'End', type: 'end', position: { x: 200, y: 0 } } as any
        ],
        connections: [{
            id: 'c1', sourceNodeId: 'start_1', sourcePort: 'out', targetNodeId: 'end_1', targetPort: 'in'
        }],
        ...patch
    };
}

describe('Workflow version diff', () => {
    it('reports identical definitions', () => {
        const diff = diffWorkflowDefinitions(definition(), definition());
        expect(diff.identical).toBe(true);
        expect(describeWorkflowDiff(diff)).toEqual([]);
    });

    it('separates added, removed and changed nodes and connections', () => {
        const after = definition({
            name: 'Demo v2',
            nodes: [
                { id: 'start_1', name: 'Start here', type: 'start', position: { x: 0, y: 40 }, config: { payload: 'two' } } as any,
                { id: 'log_1', name: 'Log', type: 'log', position: { x: 100, y: 40 } } as any
            ],
            connections: [{
                id: 'c2', sourceNodeId: 'start_1', sourcePort: 'out', targetNodeId: 'log_1', targetPort: 'in'
            }]
        });
        const diff = diffWorkflowDefinitions(definition(), after);

        expect(diff.identical).toBe(false);
        expect(diff.nameChanged).toBe(true);
        expect(diff.nodesAdded.map(node => node.id)).toEqual(['log_1']);
        expect(diff.nodesRemoved.map(node => node.id)).toEqual(['end_1']);
        expect(diff.nodesChanged.length).toBe(1);
        expect(diff.nodesChanged[0].id).toBe('start_1');
        expect(diff.nodesChanged[0].properties).toEqual(['name', 'config.payload']);
        expect(diff.nodesChanged[0].moved).toBe(true);
        expect(diff.connectionsAdded.length).toBe(1);
        expect(diff.connectionsRemoved.length).toBe(1);

        const lines = describeWorkflowDiff(diff);
        expect(lines.some(line => line.kind === 'added' && line.text.includes('Log'))).toBe(true);
        expect(lines.some(line => line.kind === 'removed' && line.text.includes('End'))).toBe(true);
        expect(lines.some(line => line.kind === 'changed' && line.text.includes('config.payload'))).toBe(true);
        expect(lines.some(line => line.kind === 'changed' && line.text.includes('position'))).toBe(true);
    });

    it('treats a pure re-layout as moved-only changes', () => {
        const moved = definition({
            nodes: [
                { id: 'start_1', name: 'Start', type: 'start', position: { x: 40, y: 60 }, config: { payload: 'one' } } as any,
                { id: 'end_1', name: 'End', type: 'end', position: { x: 260, y: 60 } } as any
            ]
        });
        const diff = diffWorkflowDefinitions(definition(), moved);
        expect(diff.nodesChanged.length).toBe(2);
        expect(diff.nodesChanged.every(node => node.moved && node.properties.length === 0)).toBe(true);
        expect(describeWorkflowDiff(diff).every(line => line.text.includes('position'))).toBe(true);
    });

    it('ignores connection ids and only compares endpoints', () => {
        const renamed = definition({
            connections: [{
                id: 'renamed-id', sourceNodeId: 'start_1', sourcePort: 'out', targetNodeId: 'end_1', targetPort: 'in'
            }]
        });
        expect(diffWorkflowDefinitions(definition(), renamed).identical).toBe(true);
    });
});
