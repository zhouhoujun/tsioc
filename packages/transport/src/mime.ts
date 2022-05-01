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
    abstract charset(type: string):string;
    /**
     * Get the default extension for a MIME type.
     * @param extname 
     * 
     */
    abstract extension(extname:string): string;

    /**
     * Create a full Content-Type header given a MIME type or extension.
     * @param str 
     */
    abstract contentType(str: string): string;
    /**
     * Lookup the MIME type for a file path/extension.
     * @param path 
     */
    abstract lookup(path:string): string;

    /**
     * Format object to media type.
     * @param media 
     */
    abstract format(media: any): string;
    /**
     * Parse media type to object.
     * @param type 
     */
    abstract parse(type: string): any;
    /**
     *  normalize Content-Type media type.
     */
    abstract normalize(type: string):string;

    abstract match(types: string[], target:string): string;
}
