import { Abstract, Injectable, tokenId } from '@tsdi/ioc';

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


@Injectable()
export class BasicMimeDb extends MimeDb {

    private extenType: Map<string, string>;
    private map: Map<string, MimeSource>;
    constructor() {
        super();
        this.map = new Map();
        this.extenType = new Map();;
    }


    from(db: Record<string, MimeSource>): void {
        this.map.clear();
        this.extenType.clear();
        Object.keys(db).forEach(type => {
            this.set(type, db[type]);
        });
    }

    protected getPreference(): (string | undefined)[] {
        return preference;
    }

    has(mime: string): boolean {
        return this.map.has(mime);
    }
    get(mime: string): MimeSource | undefined {
        return this.map.get(mime);
    }

    set(mime: string, source: MimeSource): void {
        this.map.set(mime, source);
        if (source.extensions) {
            let exts = source.extensions;
            // extension -> mime
            let preference = this.getPreference();
            for (let i = 0; i < exts.length; i++) {
                let extension = exts[i]
                const exist = this.extenType.get(extension);
                if (exist) {
                    let from = preference.indexOf(exist)
                    let to = preference.indexOf(source.source);

                    if (exist !== 'application/octet-stream' &&
                        (from > to || (from === to && exist.substring(0, 12) === 'application/'))) {
                        // skip the remapping
                        continue
                    }
                }

                // set the extension -> mime
                this.extenType.set(extension, mime);
            }
        }
    }
    remove(mime: string): void {
        this.map.delete(mime);
    }

    extension(name: string): string | undefined {
        return this.extenType.get(name);
    }

}

const preference = ['nginx', 'apache', undefined, 'iana'];
