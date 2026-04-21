import { MimeDb, MimeSource } from '@tsdi/common';
export declare class BasicMimeDb extends MimeDb {
    private extenType;
    private map;
    constructor();
    from(db: Record<string, MimeSource>): void;
    protected getPreference(): (string | undefined)[];
    has(mime: string): boolean;
    get(mime: string): MimeSource | undefined;
    set(mime: string, source: MimeSource): void;
    remove(mime: string): void;
    extension(name: string): string | undefined;
}
export declare const db: Record<string, MimeSource>;
