import expect = require('expect');
import {
    ContractCallRequest,
    ContractHttpError,
    ContractRequestError,
    ContractValidator,
    configureContractValidation,
    getContractValidationMode,
    ContractTransport,
    createContractClient,
    createFetchContractTransport,
    generateClient,
    MicroserviceContract
} from '../src';

function sampleContract(): MicroserviceContract {
    return {
        name: 'users',
        models: {
            User: {
                fields: {
                    id: { type: 'string', required: true },
                    name: { type: 'string', required: true }
                }
            },
            CreateUser: {
                fields: {
                    name: { type: 'string', required: true }
                }
            }
        },
        routes: [
            { method: 'GET', path: '/users/{id}', operationId: 'getUser', response: 'User' },
            { method: 'POST', path: '/users', operationId: 'createUser', request: 'CreateUser', response: 'User' }
        ]
    };
}

interface UserApi {
    getUser(args: { id: string }, options?: { query?: Record<string, any> }): Promise<{ id: string; name: string }>;
    createUser(options?: { body?: { name: string } }): Promise<{ id: string; name: string }>;
}

describe('contract client', () => {
    it('maps operation names to path/query/body', async () => {
        const calls: ContractCallRequest[] = [];
        const transport: ContractTransport = {
            async request<T>(request: ContractCallRequest): Promise<T> {
                calls.push(request);
                return { id: '1', name: 'Ada' } as any;
            }
        };
        const api = createContractClient<UserApi>(sampleContract(), transport);

        await api.getUser({ id: '42' }, { query: { verbose: true } });
        expect(calls[0].method).toBe('GET');
        expect(calls[0].path).toBe('/users/42');
        expect(calls[0].query).toEqual({ verbose: true });

        await api.createUser({ body: { name: 'Ada' } });
        expect(calls[1].method).toBe('POST');
        expect(calls[1].path).toBe('/users');
        expect(calls[1].body).toEqual({ name: 'Ada' });
    });

    it('validates request and response payloads', async () => {
        const transport: ContractTransport = {
            async request() {
                return { id: '1' } as any;
            }
        };
        const api = createContractClient<UserApi>(sampleContract(), transport, { validate: 'both' });

        await expect(api.createUser({ body: {} as any }))
            .rejects.toThrow(/Invalid request for createUser/);

        await expect(api.getUser({ id: '1' }))
            .rejects.toThrow(/Invalid response for getUser/);
    });

    it('supports a global validation switch with per-client override', async () => {
        configureContractValidation('both');
        expect(getContractValidationMode()).toBe('both');
        const transport: ContractTransport = { request: async () => ({ id: '1' }) as any };

        const validating = createContractClient<UserApi>(sampleContract(), transport);
        await expect(validating.getUser({ id: '1' })).rejects.toThrow(/Invalid response/);

        const overridden = createContractClient<UserApi>(sampleContract(), transport, { validate: 'none' });
        await expect(overridden.getUser({ id: '1' })).resolves.toEqual({ id: '1' });

        configureContractValidation('none');
        const lax = createContractClient<UserApi>(sampleContract(), transport);
        await expect(lax.getUser({ id: '1' })).resolves.toEqual({ id: '1' });
    });

    it('reuses compiled validators across repeated calls', () => {
        const contract = sampleContract();
        const validator = new ContractValidator(contract.models);
        const schema = { type: 'User' } as const;
        expect(validator.validate({ id: '1', name: 'Ada' }, schema)).toEqual([]);
        expect(validator.validate({ id: '1' }, schema)).toEqual(['value.name is required']);
        expect(validator.validate({ id: '1', name: 'Ada' }, schema)).toEqual([]);
        expect(validator.validate({ id: '1', name: 2 as any }, schema)).toEqual(['value.name must be a string']);
    });

    it('throws for missing path parameters', async () => {
        const api = createContractClient<UserApi>(sampleContract(), { request: async () => ({}) });
        await expect(api.getUser({} as any)).rejects.toBeInstanceOf(ContractRequestError);
    });

    it('posts through the fetch transport and surfaces HTTP errors', async () => {
        const calls: any[] = [];
        const transport = createFetchContractTransport({
            baseUrl: 'http://users.test',
            fetchImpl: (async (url: any, init: any) => {
                calls.push({ url, init });
                return {
                    ok: true,
                    status: 200,
                    async text() { return '{"id":"1"}'; }
                } as any;
            }) as any
        });
        const result = await transport.request({ method: 'POST', path: '/users', body: { name: 'Ada' }, query: { dry: true } });
        expect(result).toEqual({ id: '1' });
        expect(calls[0].url).toBe('http://users.test/users?dry=true');
        expect(calls[0].init.method).toBe('POST');
        expect(JSON.parse(calls[0].init.body)).toEqual({ name: 'Ada' });

        const failing = createFetchContractTransport({
            baseUrl: 'http://users.test',
            fetchImpl: (async () => ({
                ok: false,
                status: 400,
                async text() { return '{"message":"bad"}'; }
            })) as any
        });
        await expect(failing.request({ method: 'GET', path: '/users/1' }))
            .rejects.toBeInstanceOf(ContractHttpError);
    });

    it('generates a typed client interface and factory', () => {
        const source = generateClient(sampleContract());
        expect(source).toContain('export const contract: MicroserviceContract');
        expect(source).toContain('export interface User {');
        expect(source).toContain('getUser(args: { id: string }, options?: ContractCallOptions): Promise<User>;');
        expect(source).toContain('createUser(options?: ContractCallOptions<CreateUser>): Promise<User>;');
        expect(source).toContain('export function createUsersClient(transport: ContractTransport): UsersApi');
    });
});
