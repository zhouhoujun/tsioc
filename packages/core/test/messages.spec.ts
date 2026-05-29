import { createInjector, createRunContext, getClassRef } from '@tsdi/ioc';
import expect = require('expect');
import { RequestBody } from '@tsdi/service';
import { createMessageResolveInterceptors, MessageReaderFactory } from '../src';

class AdapterReaderFactory extends MessageReaderFactory {
    create(): any {
        return {
            field(section: string, name?: string) {
                return `reader:${section}:${name ?? '*'}`;
            }
        };
    }
}

describe('Message resolve interceptors', () => {
    it('should prefer context readMessage over MessageReaderFactory', () => {
        const injector = createInjector([{ provide: MessageReaderFactory, useClass: AdapterReaderFactory }]);
        const context = createRunContext(injector);
        context.setPayload({ body: { id: 'payload-id' } });
        (context as any).readMessage = (section: string, name?: string) => `adapter:${section}:${name ?? '*'}`;
        const parameter = { scope: 'body', field: 'id', name: 'id', nullable: false } as any;
        const interceptor = createMessageResolveInterceptors()[0];
        const next = { handle: () => 'next' } as any;

        const value = interceptor(parameter, next, context);

        expect(value).toBe('adapter:body:id');
    });

    it('should fallback to MessageReaderFactory when context readMessage is absent', () => {
        const injector = createInjector([{ provide: MessageReaderFactory, useClass: AdapterReaderFactory }]);
        const context = createRunContext(injector);
        context.setPayload({ body: { id: 'payload-id' } });
        const parameter = { scope: 'body', field: 'id', name: 'id', nullable: false } as any;
        const interceptor = createMessageResolveInterceptors()[0];
        const next = { handle: () => 'next' } as any;

        const value = interceptor(parameter, next, context);

        expect(value).toBe('reader:body:id');
    });

    it('should preserve whole-body and named-body resolution through context readMessage', () => {
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

        const injector = createInjector();
        const interceptor = createMessageResolveInterceptors()[0];
        const next = { handle: () => 'next' } as any;
        const body = { id: 'one', age: 20 };

        const wholeContext = createRunContext(injector);
        wholeContext.setPayload({ body });
        (wholeContext as any).readMessage = (section: string, name?: string) => {
            if (section !== 'body') {
                return undefined;
            }
            return name ? body[name as 'id' | 'age'] : body;
        };

        const multiContext = createRunContext(injector);
        multiContext.setPayload({ body });
        (multiContext as any).readMessage = (section: string, name?: string) => {
            if (section !== 'body') {
                return undefined;
            }
            return name ? body[name as 'id' | 'age'] : body;
        };

        const wholeParam = getClassRef(WholeBodyController).getParameters('handle')?.[0] as any;
        const multiParams = getClassRef(MultiBodyController).getParameters('handle') as any[];

        expect(interceptor(wholeParam, next, wholeContext)).toEqual(body);
        expect(interceptor(multiParams[0], next, multiContext)).toBe('one');
        expect(interceptor(multiParams[1], next, multiContext)).toBe(20);
    });
});
