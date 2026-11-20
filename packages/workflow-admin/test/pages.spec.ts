import expect = require('expect');
import { auditRows, matchesQuery, pluginRows, sessionRows } from '../src/ui/pages/page-data';
import { formatAdminDuration } from '../src/ui/pages/page-shell';

describe('workflow admin pages', () => {
    it('merges available and installed plugins with node counts', () => {
        const rows = pluginRows({
            available: [
                { id: 'b', name: 'Beta', nodes: [{}, {}] } as any,
                { id: 'a', name: 'Alpha', nodes: [{}] } as any
            ],
            installed: [{ id: 'b', name: 'Beta', version: '2.0.0', nodes: [{}] } as any]
        });
        expect(rows.map(row => row.id)).toEqual(['a', 'b']);
        expect(rows[0].installed).toBe(false);
        expect(rows[0].nodeCount).toBe(1);
        expect(rows[1].installed).toBe(true);
        expect(rows[1].version).toBe('2.0.0');
        expect(rows[1].nodeCount).toBe(1);
    });

    it('projects execution snapshots into session rows', () => {
        const rows = sessionRows([{
            executionId: 'exec_1',
            workflowId: 'flow_1',
            status: 'completed',
            startTime: 1000,
            endTime: 2500,
            currentNodeId: 'task_2',
            error: '',
            nodeStates: {},
            edgeStates: {},
            activeNodeIds: ['task_2'],
            logs: []
        }], 'en');
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe('exec_1');
        expect(rows[0].workflowId).toBe('flow_1');
        expect(rows[0].status).toBe('completed');
        expect(rows[0].duration).toBe('1.5s');
        expect(rows[0].node).toBe('task_2');
    });

    it('projects audit entries and filters case-insensitively', () => {
        const rows = auditRows([{
            id: 'audit_1',
            at: 1700000000000,
            action: 'plugin-install',
            workflowId: 'flow_1',
            actor: 'Ada'
        }], 'en');
        expect(rows[0].action).toBe('plugin-install');
        expect(rows[0].workflow).toBe('flow_1');
        expect(rows[0].actor).toBe('Ada');
        expect(rows[0].time).toBeTruthy();
        expect(matchesQuery('', 'anything')).toBe(true);
        expect(matchesQuery('ADA', 'plugin-install', 'flow_1', 'Ada')).toBe(true);
        expect(matchesQuery('missing', 'plugin-install', 'flow_1', 'Ada')).toBe(false);
    });

    it('formats durations across millisecond, second and minute ranges', () => {
        expect(formatAdminDuration(undefined)).toBe('—');
        expect(formatAdminDuration(1000, 1400)).toBe('400ms');
        expect(formatAdminDuration(1000, 2500)).toBe('1.5s');
        expect(formatAdminDuration(1_000, 62_000)).toBe('1m 1s');
    });
});
