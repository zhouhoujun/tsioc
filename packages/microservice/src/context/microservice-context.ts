import { RequestContext, REQUEST, RESPONSE, Pattern } from '@tsdi/common';
import { ContextToken, Injector } from '@tsdi/ioc';

export const MESSAGE_PATTERN = new ContextToken<Pattern | undefined>(() => undefined);
export const MESSAGE_DATA = new ContextToken<any>(() => undefined);
export const MESSAGE_ID = new ContextToken<string | number | undefined>(() => undefined);

export class MicroserviceContext extends RequestContext {
    
    getPattern(): Pattern | undefined {
        return this.get(MESSAGE_PATTERN);
    }
    
    setPattern(pattern: Pattern) {
        this.set(MESSAGE_PATTERN, pattern);
    }
    
    getData<T = any>(): T {
        return this.get(MESSAGE_DATA);
    }
    
    setData<T>(data: T) {
        this.set(MESSAGE_DATA, data);
    }
    
    getMessageId(): string | number | undefined {
        return this.get(MESSAGE_ID);
    }
    
    setMessageId(id: string | number) {
        this.set(MESSAGE_ID, id);
    }
    
    isRequest(): boolean {
        return this.getMessageId() !== undefined;
    }
    
    isEvent(): boolean {
        return this.getMessageId() === undefined;
    }
}

export function createMicroserviceContext(
    injector: Injector,
    pattern?: Pattern,
    data?: any,
    messageId?: string | number
): MicroserviceContext {
    const context = new MicroserviceContext();
    context.setInjector(injector);
    
    if (pattern) {
        context.setPattern(pattern);
    }
    
    if (data !== undefined) {
        context.setData(data);
    }
    
    if (messageId) {
        context.setMessageId(messageId);
    }
    
    return context;
}