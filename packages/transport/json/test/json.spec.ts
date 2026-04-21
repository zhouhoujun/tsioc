import expect = require('expect');
import { lastValueFrom, of } from 'rxjs';
import { JsonRequest, JsonResponse, DefaultJsonHandler } from '../src/handler';
import { JsonInterceptor } from '../src/interceptor';
import { createJsonMessage, MessageType } from '@tsdi/common';

describe('Json Transport Tests', () => {

    const context = { get: () => ({ defaultEncoding: 'utf8' }) } as any;

    describe('JsonRequest', () => {
        it('should create JsonRequest with payload', () => {
            const payload = { name: 'test', value: 123 };
            const request = new JsonRequest({ payload });
            expect(request.payload).toEqual(payload);
            expect(request.body).toEqual(payload);
        });

        it('should create JsonRequest with pattern', () => {
            const payload = { data: 'value' };
            const request = new JsonRequest({ pattern: 'test.route', payload });
            expect(request.pattern).toBe('test.route');
            expect(request.payload).toEqual(payload);
        });

        it('should convert to JsonMessage', () => {
            const payload = { key: 'value' };
            const request = new JsonRequest({ payload, headers: { 'custom': 'value' } });
            const message = request.toMessage();
            expect(message.type).toBe(MessageType.JSON);
            expect(message.payload).toEqual(payload);
            expect(message.headers?.['custom']).toBe('value');
        });
    });

    describe('JsonResponse', () => {
        it('should create JsonResponse with message', () => {
            const payload = { result: 'success' };
            const message = createJsonMessage(payload);
            const response = new JsonResponse(message);
            expect(response.body).toEqual(payload);
            expect(response.status).toBe(200);
            expect(response.ok).toBe(true);
        });

        it('should create JsonResponse with error status', () => {
            const payload = { error: 'failed' };
            const message = createJsonMessage(payload);
            const response = new JsonResponse(message, 500, 'Internal Server Error');
            expect(response.status).toBe(500);
            expect(response.ok).toBe(false);
            expect(response.statusText).toBe('Internal Server Error');
        });
    });

    describe('DefaultJsonHandler', () => {
        it('should handle JsonMessage', async () => {
            const handler = new DefaultJsonHandler();
            const payload = { name: 'handler-test' };
            const message = createJsonMessage(payload);
            const result = await lastValueFrom(handler.handle(message, context));
            expect(result.body).toEqual(payload);
            expect(result.ok).toBe(true);
        });

        it('should handle JsonRequest', async () => {
            const handler = new DefaultJsonHandler();
            const payload = { request: 'data' };
            const request = new JsonRequest({ payload });
            const result = await lastValueFrom(handler.handle(request, context));
            expect(result.body).toEqual(payload);
        });
    });

    describe('JsonInterceptor', () => {
        it('should intercept and process object', async () => {
            const interceptor = new JsonInterceptor();
            const input = { test: 'object' };

            const result$ = interceptor.intercept(
                input,
                (msg) => of(msg),
                context
            );

            expect(result$).toBeDefined();
            const result = await lastValueFrom(result$);
            expect(result.type).toBe(MessageType.JSON);
            expect(result.payload).toEqual(input);
        });

        it('should intercept and process JSON string', async () => {
            const interceptor = new JsonInterceptor();
            const input = '{"key":"value"}';

            const result$ = interceptor.intercept(
                input,
                (msg) => of(msg),
                context
            );

            const result = await lastValueFrom(result$);
            expect(result.type).toBe(MessageType.JSON);
            expect(result.payload).toEqual({ key: 'value' });
        });

        it('should throw on invalid JSON string', async () => {
            const interceptor = new JsonInterceptor();
            const input = 'not valid json';

            try {
                await lastValueFrom(interceptor.intercept(
                    input,
                    (msg) => of(msg),
                    context
                ));
                throw new Error('Should have thrown');
            } catch (err) {
                expect(err).toBeDefined();
                expect((err as Error).message).toContain('Invalid JSON');
            }
        });
    });
});