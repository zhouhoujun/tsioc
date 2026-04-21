import expect = require('expect');
import { lastValueFrom, of } from 'rxjs';
import { TextRequest, TextResponse, DefaultTextHandler } from '../src/handler';
import { TextInterceptor } from '../src/interceptor';
import { createTextMessage, MessageType } from '@tsdi/common';

describe('Text Transport Tests', () => {

    const context = { get: () => ({ defaultEncoding: 'utf8' }) } as any;

    describe('TextRequest', () => {
        it('should create TextRequest with text', () => {
            const request = new TextRequest({ text: 'Hello World' });
            expect(request.text).toBe('Hello World');
            expect(request.encoding).toBe('utf8');
        });

        it('should create TextRequest with pattern', () => {
            const request = new TextRequest({ pattern: 'test.route', text: 'data' });
            expect(request.pattern).toBe('test.route');
            expect(request.text).toBe('data');
        });

        it('should convert to TextMessage', () => {
            const request = new TextRequest({ text: 'Test', headers: { 'custom': 'value' } });
            const message = request.toMessage();
            expect(message.type).toBe(MessageType.TEXT);
            expect(message.payload).toBe('Test');
            expect(message.headers?.['custom']).toBe('value');
        });
    });

    describe('TextResponse', () => {
        it('should create TextResponse with message', () => {
            const message = createTextMessage('Response text');
            const response = new TextResponse(message);
            expect(response.body).toBe('Response text');
            expect(response.status).toBe(200);
            expect(response.ok).toBe(true);
        });

        it('should create TextResponse with error status', () => {
            const message = createTextMessage('Error');
            const response = new TextResponse(message, 500, 'Internal Server Error');
            expect(response.status).toBe(500);
            expect(response.ok).toBe(false);
            expect(response.statusText).toBe('Internal Server Error');
        });
    });

    describe('DefaultTextHandler', () => {
        it('should handle TextMessage', async () => {
            const handler = new DefaultTextHandler();
            const message = createTextMessage('Hello');
            const result = await lastValueFrom(handler.handle(message, context));
            expect(result.body).toBe('Hello');
            expect(result.ok).toBe(true);
        });

        it('should handle TextRequest', async () => {
            const handler = new DefaultTextHandler();
            const request = new TextRequest({ text: 'Request data' });
            const result = await lastValueFrom(handler.handle(request.toMessage(), context));
            expect(result.body).toBe('Request data');
        });
    });

    describe('TextInterceptor', () => {
        it('should intercept and process text', async () => {
            const interceptor = new TextInterceptor();
            const input = 'Test string';

            const result$ = interceptor.intercept(
                input,
                (msg) => of(msg),
                context
            );

            expect(result$).toBeDefined();
            const result = await lastValueFrom(result$);
            expect(result.payload).toBe('Test string');
        });
    });
});