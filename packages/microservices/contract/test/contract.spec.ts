import expect = require('expect');
import * as ts from 'typescript';
import {
    generateContract,
    generateDto,
    generateOpenApi,
    generateProto,
    MicroserviceContract,
    validateContract
} from '../src';

function sampleContract(): MicroserviceContract {
    return {
        name: 'orders',
        title: 'Orders API',
        version: '1.2.0',
        description: 'Order service contract',
        service: { name: 'OrdersService', package: 'shop.orders' },
        models: {
            CreateOrder: {
                description: 'Create order payload',
                fields: {
                    id: { type: 'string', required: true, format: 'uuid', description: 'Client id' },
                    quantity: { type: 'integer', required: true },
                    status: { type: 'string', enum: ['new', 'paid'] },
                    items: { type: 'array', items: { type: 'OrderItem' } },
                    shipping: {
                        type: 'object',
                        properties: {
                            street: { type: 'string', required: true },
                            zip: { type: 'string' }
                        }
                    },
                    note: { type: 'string' }
                }
            },
            OrderItem: {
                fields: {
                    sku: { type: 'string', required: true },
                    price: { type: 'number' }
                }
            },
            Order: {
                fields: {
                    id: { type: 'string', required: true },
                    status: { type: 'string', enum: ['new', 'paid'] },
                    items: { type: 'array', items: { type: 'OrderItem' } }
                }
            }
        },
        routes: [
            { method: 'post', path: '/orders', operationId: 'createOrder', request: 'CreateOrder', response: 'Order', tags: ['orders'], errors: [400] },
            { method: 'get', path: '/orders/{id}', operationId: 'getOrder', response: 'Order' },
            { method: 'delete', path: '/orders/:id', operationId: 'deleteOrder', errors: [404] }
        ]
    };
}

describe('microservice contract validation', () => {
    it('accepts a well-formed contract', () => {
        expect(validateContract(sampleContract())).toEqual([]);
    });

    it('reports unknown types, duplicate routes and missing array items', () => {
        const contract = sampleContract();
        contract.models.CreateOrder.fields.missing = { type: 'MissingModel' };
        contract.models.CreateOrder.fields.broken = { type: 'array' };
        contract.routes!.push({ method: 'POST', path: '/orders' });
        const errors = validateContract(contract);
        expect(errors.some(error => error.includes("unknown type 'MissingModel'"))).toBe(true);
        expect(errors.some(error => error.includes('array items schema is required'))).toBe(true);
        expect(errors.some(error => error.includes("duplicate route 'POST /orders'"))).toBe(true);
    });
});

describe('DTO generation', () => {
    it('renders classes, optional fields, enums, arrays and inline objects', () => {
        const dto = generateDto(sampleContract());
        expect(dto).toContain('export class CreateOrder {');
        expect(dto).toContain('id!: string;');
        expect(dto).toContain('quantity!: number;');
        expect(dto).toContain('status?: "new" | "paid";');
        expect(dto).toContain('items?: Array<OrderItem>;');
        expect(dto).toContain('shipping?: { street: string; zip?: string; };');
        expect(dto).toContain('note?: string;');
        const transpiled = ts.transpileModule(dto, {
            compilerOptions: { experimentalDecorators: true, target: ts.ScriptTarget.ES2020 }
        });
        expect(transpiled.diagnostics?.length ?? 0).toBe(0);
    });

    it('supports interfaces and swagger decorators', () => {
        const contract = sampleContract();
        const interfaces = generateDto(contract, { dtoStyle: 'interface' });
        expect(interfaces).toContain('export interface CreateOrder {');
        expect(interfaces).toContain('id: string;');
        expect(interfaces).not.toContain('!:' );

        const decorated = generateDto(contract, { decorators: true });
        expect(decorated).toContain(`import { ApiModelProperty } from '@tsdi/swagger';`);
        expect(decorated).toContain('@ApiModelProperty({ description: "Client id", required: true, type: "string", format: "uuid" })');
        const transpiled = ts.transpileModule(decorated, {
            compilerOptions: { experimentalDecorators: true, target: ts.ScriptTarget.ES2020 }
        });
        expect(transpiled.diagnostics?.length ?? 0).toBe(0);
    });
});

describe('OpenAPI generation', () => {
    it('builds schemas, request bodies, responses and path parameters', () => {
        const doc = generateOpenApi(sampleContract());
        expect(doc.openapi).toBe('3.0.2');
        expect(doc.info.title).toBe('Orders API');
        expect(doc.info.version).toBe('1.2.0');
        expect(doc.components.schemas.CreateOrder.required).toEqual(['id', 'quantity']);
        expect(doc.components.schemas.CreateOrder.properties.status.enum).toEqual(['new', 'paid']);
        expect(doc.components.schemas.CreateOrder.properties.items.items).toEqual({ $ref: '#/components/schemas/OrderItem' });
        expect(doc.paths['/orders'].post.requestBody.content['application/json'].schema)
            .toEqual({ $ref: '#/components/schemas/CreateOrder' });
        expect(doc.paths['/orders'].post.responses['400'].description).toContain('400');
        expect(doc.paths['/orders/{id}'].get.parameters).toEqual([
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ]);
        expect(doc.paths['/orders/{id}'].delete.responses['204']).toBeDefined();
        expect(doc.paths['/orders/{id}'].delete.responses['404']).toBeDefined();
    });
});

describe('proto generation', () => {
    it('renders messages, nested objects, repeated fields and RPCs', () => {
        const proto = generateProto(sampleContract());
        expect(proto).toContain('syntax = "proto3";');
        expect(proto).toContain('package shop.orders;');
        expect(proto).toContain('message CreateOrder {');
        expect(proto).toContain('string id = 1;');
        expect(proto).toContain('int64 quantity = 2;');
        expect(proto).toContain('optional string status = 3; // enum: new, paid');
        expect(proto).toContain('repeated OrderItem items = 4;');
        expect(proto).toContain('optional CreateOrderShipping shipping = 5;');
        expect(proto).toContain('message CreateOrderShipping {');
        expect(proto).toContain('service OrdersService {');
        expect(proto).toContain('// HTTP POST /orders');
        expect(proto).toContain('rpc CreateOrder (CreateOrder) returns (Order);');
        expect(proto).toContain('rpc DeleteOrder (Empty) returns (Empty);');
        expect(proto).toContain('message Empty {}');
    });

    it('uses a custom proto package', () => {
        const proto = generateProto(sampleContract(), 'custom.pkg');
        expect(proto).toContain('package custom.pkg;');
    });
});

describe('generateContract', () => {
    it('returns all generated artifacts', () => {
        const result = generateContract(sampleContract());
        expect(result.dto).toContain('export class Order {');
        expect(result.openapi.openapi).toBe('3.0.2');
        expect(result.proto).toContain('service OrdersService');
    });

    it('throws a validation error for broken manifests', () => {
        const contract = sampleContract();
        contract.routes!.push({ method: 'GET', path: '/x', response: 'Missing' });
        expect(() => generateContract(contract)).toThrow('Invalid microservice contract');
    });
});
