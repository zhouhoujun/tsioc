import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    buildWebSidebarProjects,
    filterWebSidebarSessions,
    groupWebSidebarSessions,
    matchWebSidebarSession,
    normalizeWebSidebarQuery,
    resolveWebSidebarProjectKey,
    resolveWebSidebarProjectLabel,
    searchWebSidebarProjects
} from '../web-console/session-search';

const NOW = new Date('2026-11-15T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

function session(overrides: Record<string, any>): any {
    return { id: 'session', current: false, ...overrides };
}

@Suite('web sidebar session search')
export class WebSidebarSessionSearchTest {
    @Test('project keys follow the terminal console precedence')
    projectKeys() {
        expect(resolveWebSidebarProjectKey(session({ projectKey: 'workspace:/a', projectId: 'p1' })))
            .toEqual('workspace:/a');
        expect(resolveWebSidebarProjectKey(session({ projectId: 'p1', primaryThreadId: 't1' })))
            .toEqual('project:p1');
        expect(resolveWebSidebarProjectKey(session({ primaryThreadId: 't1', workspace: '/repo/beta' })))
            .toEqual('thread:t1');
        expect(resolveWebSidebarProjectKey(session({ workspace: '/repo/beta/' })))
            .toEqual('workspace:/repo/beta');
        expect(resolveWebSidebarProjectKey(session({}))).toEqual('workspace:default');
    }

    @Test('project labels prefer the explicit label, then id, then folder name')
    projectLabels() {
        expect(resolveWebSidebarProjectLabel(session({ projectLabel: 'Alpha', projectId: 'p1' }))).toEqual('Alpha');
        expect(resolveWebSidebarProjectLabel(session({ projectId: 'p1', workspace: '/repo/beta' }))).toEqual('p1');
        expect(resolveWebSidebarProjectLabel(session({ workspace: '/repo/beta/' }))).toEqual('beta');
        expect(resolveWebSidebarProjectLabel(session({ projectLabel: '/repo/alpha' }))).toEqual('alpha');
        expect(resolveWebSidebarProjectLabel(session({}))).toEqual('');
    }

    @Test('project index merges console projects with session-implied ones without double counting')
    mergeProjects() {
        const projects = buildWebSidebarProjects([
            session({ id: 'a', projectKey: 'workspace:/repo/alpha', projectLabel: 'alpha', updatedAt: NOW - 1000 }),
            session({ id: 'b', projectKey: 'workspace:/repo/alpha', projectLabel: 'alpha', updatedAt: NOW - 2000 }),
            session({ id: 'c', workspace: '/repo/beta', updatedAt: NOW - 3000 })
        ], [{ key: 'workspace:/repo/alpha', label: 'alpha', sessionCount: 99, lastActive: 1 }]);
        expect(projects.map(project => [project.key, project.label, project.sessionCount])).toEqual([
            ['workspace:/repo/alpha', 'alpha', 2],
            ['workspace:/repo/beta', 'beta', 1]
        ]);
        const indexed = buildWebSidebarProjects(
            [session({ id: 'a', projectKey: 'workspace:/repo/alpha' })],
            [{ key: 'workspace:/repo/alpha', label: '/repo/alpha', sessionCount: 1 }]
        );
        expect(indexed[0].label).toEqual('alpha');
    }

    @Test('project search matches labels, keys and folder names')
    searchProjects() {
        const projects = buildWebSidebarProjects([
            session({ id: 'a', workspace: '/repo/alpha' }),
            session({ id: 'b', workspace: '/repo/beta' })
        ]);
        expect(normalizeWebSidebarQuery('  ALPHA ')).toEqual('alpha');
        expect(searchWebSidebarProjects(projects, 'alp').map(project => project.label)).toEqual(['alpha']);
        expect(searchWebSidebarProjects(projects, 'repo/bet').map(project => project.label)).toEqual(['beta']);
        expect(searchWebSidebarProjects(projects, '').length).toEqual(2);
    }

    @Test('session search matches title, id, workspace and project fields')
    sessionMatching() {
        const item = session({
            id: 'sess-42',
            title: 'Review the parser',
            summary: 'markdown tables',
            workspace: '/repo/alpha',
            projectId: 'proj-7'
        });
        expect(matchWebSidebarSession(item, 'parser')).toEqual(true);
        expect(matchWebSidebarSession(item, 'sess-42')).toEqual(true);
        expect(matchWebSidebarSession(item, 'alpha')).toEqual(true);
        expect(matchWebSidebarSession(item, 'proj-7')).toEqual(true);
        expect(matchWebSidebarSession(item, 'missing')).toEqual(false);
        expect(matchWebSidebarSession(item, '   ')).toEqual(true);
    }

    @Test('filtering combines text, project scope and the result limit')
    filterSessions() {
        const sessions = [
            session({ id: 'a', title: 'Alpha work', projectKey: 'workspace:/repo/alpha', updatedAt: NOW - 1000 }),
            session({ id: 'b', title: 'Alpha review', projectKey: 'workspace:/repo/alpha', updatedAt: NOW - 2000 }),
            session({ id: 'c', title: 'Beta work', projectKey: 'workspace:/repo/beta', updatedAt: NOW - 3000 })
        ];
        expect(filterWebSidebarSessions({ sessions, query: 'alpha' }).map(item => item.id)).toEqual(['a', 'b']);
        expect(filterWebSidebarSessions({ sessions, projectKey: 'workspace:/repo/beta' }).map(item => item.id)).toEqual(['c']);
        expect(filterWebSidebarSessions({ sessions, query: 'work', projectKey: 'workspace:/repo/alpha' }).map(item => item.id)).toEqual(['a']);
        expect(filterWebSidebarSessions({ sessions, limit: 2 }).map(item => item.id)).toEqual(['a', 'b']);
    }

    @Test('date buckets use today/yesterday/7 days/older/undated order')
    dateGroups() {
        const sessions = [
            session({ id: 'older', updatedAt: NOW - 20 * DAY }),
            session({ id: 'today-old', updatedAt: NOW - 2 * 60 * 60 * 1000 }),
            session({ id: 'undated' }),
            session({ id: 'yesterday', updatedAt: NOW - DAY }),
            session({ id: 'week', updatedAt: NOW - 3 * DAY }),
            session({ id: 'today-new', updatedAt: NOW - 60 * 1000 })
        ];
        const groups = groupWebSidebarSessions(sessions, NOW);
        expect(groups.map(group => group.key)).toEqual(['today', 'yesterday', 'previous7Days', 'older', 'unknownDate']);
        expect(groups[0].sessions.map(item => item.id)).toEqual(['today-new', 'today-old']);
        expect(groups[4].sessions.map(item => item.id)).toEqual(['undated']);
    }

    @Test('empty input keeps groups empty instead of inventing buckets')
    emptyGroups() {
        expect(groupWebSidebarSessions([], NOW)).toEqual([]);
    }
}
