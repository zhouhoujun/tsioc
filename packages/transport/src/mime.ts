import { Abstract } from '@tsdi/ioc';

/**
 * mime type adapter.
 */
@Abstract()
export abstract class MimeAdapter {
    /**
     * Get the default charset for a MIME type.
     * @param type 
     */
    abstract charset(type: string): string | false;
    /**
     * Get the default extension for a MIME type.
     * @param extname 
     * 
     */
    abstract extension(extname: string): string | false;

    /**
     * Create a full Content-Type header given a MIME type or extension.
     * @param str 
     */
    abstract contentType(str: string): string | false;
    /**
     * Lookup the MIME type for a file path/extension.
     * @param path 
     */
    abstract lookup(path: string): string | false;

    /**
     * Format object to media type.
     * @param media 
     */
    abstract format(media: SplitType): string;
    /**
     * Parse media type to object.
     * @param type 
     */
    abstract parse(type: string): SplitType;
    /**
     *  normalize Content-Type media type.
     */
    abstract normalize(type: string): string | false;

    abstract match(types: string[], target: string): string | false;
}

export interface SplitType {
    type: string;
    subtype: string;
    suffix?: string;
    parameters?: Record<string, any>;
}

export interface MimeSource {
    source?: string;
    charset?: string;
    compressible?: boolean;
    extensions?: string[];
}

@Abstract()
export abstract class MimeDb {
    abstract from(db: Record<string, MimeSource>): void;
    abstract has(mime: string): boolean;
    abstract get(mime: string): MimeSource|undefined;
    abstract set(mime: string, source: MimeSource): void;
    abstract remove(mime: string): void;
    /**
     * get mime with extenstion name.
     * @param name
     * @returns mime type.
     */
    abstract extension(name: string): string | undefined;
}

@Abstract()
export abstract class MimeTypes {
    /**
     * json alias mime names
     */
    abstract get json(): string[];
    /**
     * form alias mime names
     */
    abstract get form(): string[];
    /**
     * text alias mime names
     */
    abstract get text(): string[];
    /**
     * xml alias mime names
     */
    abstract get xml(): string[];
    /**
     * append mime type.
     * @param type type of mime.
     * @param mimes mime names.
     */
    abstract append(type: 'json' | 'form' | 'text' | 'xml', mimes: string[]): this;
}
