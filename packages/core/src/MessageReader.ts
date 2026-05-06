import { Abstract } from '@tsdi/ioc';

/**
 * Message section names, matching the `scope` values set by parameter decorators:
 *
 * | Decorator           | scope        |
 * |---------------------|--------------|
 * | `@RequestHeader()`  | `'headers'`  |
 * | `@RequestPath()`    | `'path'`     |
 * | `@RequestParam()`   | `'query'`    |
 * | `@RequestBody()`    | `'body'`     |
 * | `@RequestPayload()` | `'payload'`  |
 * | `@Topic()`          | `'topic'`    |
 */
export type MessageSection = 'headers' | 'payload' | 'body' | 'params' | 'query' | 'path' | 'topic';

/**
 * Abstract message reader.
 *
 * Each protocol transport (TCP, HTTP, MQTT, AMQP, etc.) extends this class to
 * implement protocol-specific extraction logic.  Controller parameter decorators
 * (`@RequestHeader`, `@RequestBody`, `@RequestParam`, `@RequestPath`,
 * `@RequestPayload`) resolve their values through a reader obtained from the
 * container via {@link MessageReaderFactory.create}.
 */
@Abstract()
export abstract class AbstractMessageReader<TBody = any> {

    // -- headers ------------------------------------------------------------

    /** Return every header. */
    abstract headers(): Record<string, any>;
    /** Return a single header by name (case-insensitive). */
    abstract header(name: string): any;

    // -- payload ------------------------------------------------------------

    /** Return the full payload. */
    abstract payload(): TBody | null | undefined;
    /**
     * Return a named field from the payload.
     * When the payload is an object, `payload('name')` reads `payload.name`.
     */
    abstract payload<K extends keyof TBody>(field: K): TBody[K];
    abstract payload(field: string): any;

    // -- body ---------------------------------------------------------------

    /** Return the full body. */
    abstract body(): TBody | null | undefined;
    /**
     * Return a named field from the body.
     * When the body is an object, `body('name')` reads `body.name`.
     */
    abstract body<K extends keyof TBody>(field: K): TBody[K];
    abstract body(field: string): any;

    // -- params -------------------------------------------------------------

    /** Return all route/pattern params. */
    abstract params(): Record<string, any> | undefined;
    /** Return a single param by name. */
    abstract param(name: string): any;

    // -- query --------------------------------------------------------------

    /** Return all query parameters. */
    abstract query(): Record<string, any> | undefined;
    /** Return a single query value by name. */
    abstract query(name: string): any;

    // -- path ---------------------------------------------------------------

    /** Return all path variables (restful params). */
    abstract path(): Record<string, any> | undefined;
    /** Return a single path variable by name. */
    abstract path(name: string): any;

    // -- topic --------------------------------------------------------------

    /** Return the topic / routing-key string. */
    abstract topic(): string | undefined;

    // -- generic field access -----------------------------------------------

    /**
     * Read a named field from a given message section.
     *
     * ```ts
     * reader.field('headers', 'authorization');
     * reader.field('body', 'email');
     * reader.field('params', 'page');
     * reader.field('query', 'sort');
     * reader.field('path', 'id');
     * reader.field('topic');
     * ```
     */
    field(section: MessageSection, name?: string): any {
        switch (section) {
            case 'headers':
                return name ? this.header(name) : this.headers();
            case 'payload':
                return name ? this.payload(name) : this.payload();
            case 'body':
                return name ? this.body(name) : this.body();
            case 'params':
                return name ? this.param(name) : this.params();
            case 'query':
                return name ? this.query(name) : this.query();
            case 'path':
                return name ? this.path(name) : this.path();
            case 'topic':
                return this.topic();
            default:
                return undefined;
        }
    }

    /**
     * Receive an incoming message and make it readable by this reader.
     * Called before any field extraction so the implementation can parse /
     * cache the raw input.
     */
    abstract receive(input: any): void;
}

/**
 * Abstract factory for creating protocol-specific {@link AbstractMessageReader}
 * instances.
 *
 * Each transport protocol registers its own factory implementation in the IoC
 * container.  When a controller needs to resolve parameter values, the framework
 * obtains a reader from the factory via {@link create}, passing the raw message,
 * and then uses {@link AbstractMessageReader.field} to extract values.
 */
@Abstract()
export abstract class MessageReaderFactory {
    /**
     * Create a new reader instance initialized with the given message.
     */
    abstract create(message?: any): AbstractMessageReader;
}
