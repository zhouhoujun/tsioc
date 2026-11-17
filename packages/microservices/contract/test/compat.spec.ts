import expect = require('expect');
import { assertCompatible, compareContracts, ContractCompatibilityError } from '../src/compat';
import { MicroserviceContract } from '../src/types';

describe('contract compatibility', () => {
    function contract(overrides: Partial<MicroserviceContract> = {}): MicroserviceContract {
        return {
            name: 'users',
            version: '1.0.0',
            models: {
                User: {
                    fields: {
                        id: { type: 'string', required: true },
                        age: { type: 'integer' },
                        role: { type: 'string', enum: ['admin', 'user'] }
                    }
                }
            },
            routes: [
                { method: 'GET', path: '/api/users/:id', response: 'User' },
                { method: 'POST', path: '/api/users', request: 'User', response: 'User' }
            ],
            ...overrides
        };
    }

    it('reports no breaking changes for identical contracts', () => {
        const issues = compareContracts(contract(), contract());
        expect(issues.filter(issue => issue.severity === 'breaking')).toEqual([]);
    });

    it('flags removed models, fields, type changes and required additions', () => {
        const next = contract({
            models: {
                User: {
                    fields: {
                        id: { type: 'number', required: true },
                        age: { type: 'integer', required: true },
                        role: { type: 'string', enum: ['admin'] }
                    }
                }
            }
        });
        const issues = compareContracts(contract(), next);
        const kinds = issues.map(issue => issue.kind);
        expect(kinds).toContain('field_type_changed');
        expect(kinds).toContain('field_required');
        expect(kinds).toContain('enum_value_removed');
        expect(issues.find(issue => issue.kind === 'field_type_changed')?.path).toBe('models.User.id');
        expect(issues.every(issue => issue.suggestion.length > 0)).toBe(true);

        const removed = compareContracts(contract(), contract({ models: {} }));
        expect(removed.some(issue => issue.kind === 'model_removed')).toBe(true);
    });

    it('flags removed and changed routes', () => {
        const next = contract({
            routes: [
                { method: 'GET', path: '/api/users/:id', response: 'User' }
            ]
        });
        const issues = compareContracts(contract(), next);
        expect(issues.some(issue => issue.kind === 'route_removed' && issue.path === 'routes.POST /api/users')).toBe(true);

        const changed = compareContracts(contract(), contract({
            routes: [
                { method: 'GET', path: '/api/users/:id', response: 'Other' },
                { method: 'POST', path: '/api/users', request: 'Other', response: 'User' }
            ]
        }));
        expect(changed.some(issue => issue.kind === 'response_model_changed')).toBe(true);
        expect(changed.some(issue => issue.kind === 'request_model_changed')).toBe(true);
    });

    it('treats integer/number and additive changes as compatible', () => {
        const next = contract({
            models: {
                User: {
                    fields: {
                        id: { type: 'string', required: true },
                        age: { type: 'number' },
                        role: { type: 'string', enum: ['admin', 'user', 'guest'] },
                        email: { type: 'string' }
                    }
                },
                Team: { fields: { name: { type: 'string' } } }
            },
            routes: [
                { method: 'GET', path: '/api/users/:id', response: 'User' },
                { method: 'POST', path: '/api/users', request: 'User', response: 'User' },
                { method: 'GET', path: '/api/teams', response: 'Team' }
            ]
        });
        const issues = compareContracts(contract(), next);
        expect(issues.filter(issue => issue.severity === 'breaking')).toEqual([]);
        expect(issues.some(issue => issue.kind === 'field_added')).toBe(true);
        expect(issues.some(issue => issue.kind === 'model_added')).toBe(true);
        expect(issues.some(issue => issue.kind === 'route_added')).toBe(true);
    });

    it('throws only when breaking changes exist', () => {
        expect(() => assertCompatible(contract(), contract())).not.toThrow();
        expect(() => assertCompatible(contract(), contract({ models: {} }))).toThrow(/Incompatible contract changes/);
        try {
            assertCompatible(contract(), contract({ models: {} }));
        } catch (error) {
            const compat = error as ContractCompatibilityError;
            expect(compat.name).toBe('ContractCompatibilityError');
            expect(compat.message).toContain('models.User');
            expect(compat.issues.some(issue => issue.kind === 'field_removed' || issue.kind === 'model_removed')).toBe(true);
        }
    });
});
