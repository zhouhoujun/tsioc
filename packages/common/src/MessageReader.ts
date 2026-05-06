import { Injectable } from '@tsdi/ioc';
import { AbstractMessageReader, MessageReaderFactory } from '@tsdi/core';
import { BaseIncoming } from './incoming';

export { MessageSection } from '@tsdi/core';

/**
 * Default {@link AbstractMessageReader} implementation that reads from a
 * {@link BaseIncoming}-shaped object.
 *
 * Handles the `path` ↔ `paths` mapping that the `@RequestPath` decorator
 * (`scope = 'path'`) requires.
 */
@Injectable()
export class IncomingMessageReaderFactory extends MessageReaderFactory {
    create(message?: any): AbstractMessageReader {
        return new IncomingMessageReader(message);
    }
}

/**
 * Default {@link AbstractMessageReader} implementation that reads from a
 * {@link BaseIncoming}-shaped object.
 *
 * Handles the `path` ↔ `paths` mapping that the `@RequestPath` decorator
 * (`scope = 'path'`) requires.
 */
@Injectable()
export class IncomingMessageReader<TBody = any> extends AbstractMessageReader<TBody> {

    private incoming?: BaseIncoming<TBody>;

    constructor(incoming?: BaseIncoming<TBody>) {
        super();
        this.incoming = incoming;
    }

    receive(input: BaseIncoming<TBody>): void {
        this.incoming = input;
    }

    // -- headers ------------------------------------------------------------

    headers(): Record<string, any> {
        return this.incoming?.headers ?? {};
    }
    header(name: string): any {
        const inc = this.incoming;
        if (!inc) return undefined;
        if (inc.getHeader) return inc.getHeader(name);
        return (inc.headers as any)?.[name];
    }

    // -- payload ------------------------------------------------------------

    payload(): TBody | null | undefined;
    payload<K extends keyof TBody>(field: K): TBody[K];
    payload(field: string): any;
    payload(field?: string): any {
        const p = this.incoming?.body;
        if (field === undefined) return p;
        return p ? (p as any)[field] : undefined;
    }

    // -- body ---------------------------------------------------------------

    body(): TBody | null | undefined;
    body<K extends keyof TBody>(field: K): TBody[K];
    body(field: string): any;
    body(field?: string): any {
        const b = this.incoming?.body;
        if (field === undefined) return b;
        return b ? (b as any)[field] : undefined;
    }

    // -- params -------------------------------------------------------------

    params(): Record<string, any> | undefined {
        return this.incoming?.params;
    }
    param(name: string): any {
        return this.incoming?.params?.[name];
    }

    // -- query --------------------------------------------------------------

    query(): Record<string, any> | undefined;
    query(name: string): any;
    query(name?: string): any {
        const q = this.incoming?.query;
        if (name === undefined) return q;
        return q?.[name];
    }

    // -- path ---------------------------------------------------------------

    /**
     * Reads from `incoming.paths` (plural) which is the canonical property
     * name on {@link BaseIncoming}, while the `@RequestPath` decorator
     * uses scope `'path'` (singular).
     */
    path(): Record<string, any> | undefined;
    path(name: string): any;
    path(name?: string): any {
        const p = this.incoming?.paths;
        if (name === undefined) return p;
        return p?.[name];
    }

    // -- topic --------------------------------------------------------------

    topic(): string | undefined {
        return this.incoming?.pattern;
    }
}
