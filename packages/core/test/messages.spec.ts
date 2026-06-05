import { createInjector, createRunContext, getClassRef, Provider } from '@tsdi/ioc';
import expect = require('expect');
import { RequestBody } from '@tsdi/service';
import { MessageValueReader, DefaultMessageValueReader } from '../src';
import { createMessageResolveInterceptors } from '../src';

describe('Message resolve interceptors', () => {
    it('should use context readMessage when available', () => {
        const injector = createInjector([
            { provide: MessageValueReader, useValue: {
                read: (name: string | undefined, _ctx: any, section?: string) => ({ success: true, value: `reader:${section}:${name ?? '*'}` })
            } as MessageValueReader }
        ]);
        const context = createRunContext(injector);
        context.setPayload({ body: { id: 'payload-id' } });
        const parameter = { scope: 'body', field: 'id', name: 'id', nullable: false } as any;
        const interceptor = createMessageResolveInterceptors()[0];
        const next = () => 'next' as any;

        const value = interceptor(parameter, next, context);

        expect(value).toBe('reader:body:id');
    });

    it('should fallback to direct payload properties when adapter is absent', () => {
        const injector = createInjector([
            { provide: MessageValueReader, useClass: DefaultMessageValueReader }
        ]);
        const context = createRunContext(injector);
        context.setPayload({ body: { id: 'payload-id' } });
        const parameter = { scope: 'body', field: 'id', name: 'id', nullable: false } as any;
        const interceptor = createMessageResolveInterceptors()[0];
        const next = () => 'next' as any;

        const value = interceptor(parameter, next, context);

        expect(value).toBe('payload-id');
    });

    it('should preserve whole-body and named-body resolution through adapter.read', () => {
        class WholeBodyController {
            handle(@RequestBody() _body: any) {
                return _body;
            }
        }
        class MultiBodyController {
            handle(@RequestBody('id') _id: string, @RequestBody('age') _age: number) {
                return [_id, _age];
            }
        }

        const body = { id: 'one', age: 20 };
        const reader: MessageValueReader = {
            read(name: string | undefined, payload: any, section?: string): any {
                if (section !== 'body') {
                    return { success: false, value: undefined };
                }
                const scopeVal = payload?.body ?? payload?.payload;
                if (!scopeVal) {
                    return { success: false, value: undefined };
                }
                const value = name ? scopeVal[name as 'id' | 'age'] : scopeVal;
                if (section === 'body' && value == null) {
                    return { success: true, value: scopeVal };
                }
                return { success: true, value };
            }
        };
        const injector = createInjector([
            { provide: MessageValueReader, useValue: reader }
        ]);
        const interceptor = createMessageResolveInterceptors()[0];
        const next = () => 'next' as any;

        const wholeContext = createRunContext(injector);
        wholeContext.setPayload({ body });
        const multiContext = createRunContext(injector);
        multiContext.setPayload({ body });

        const wholeParam = getClassRef(WholeBodyController).getParameters('handle')?.[0] as any;
        const multiParams = getClassRef(MultiBodyController).getParameters('handle') as any[];

        const wholeValue = interceptor(wholeParam, next, wholeContext);
        const firstField = interceptor(multiParams[0], next, multiContext);
        const secondField = interceptor(multiParams[1], next, multiContext);

        expect(wholeValue).toBe(body);
        expect(firstField).toBe('one');
        expect(secondField).toBe(20);
    });
});
