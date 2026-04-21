import { FileAdapter, MimeAdapter, MimeDb, MimeTypes, SplitType } from '@tsdi/common';
export declare class MimeAdapterImpl extends MimeAdapter {
    readonly mimeTypes: MimeTypes;
    private db;
    private adapter;
    constructor(mimeTypes: MimeTypes, db: MimeDb, adapter: FileAdapter);
    charset(type: string): string | false;
    extension(extname: string): string | false;
    contentType(str: string): string | false;
    lookup(path: string): string | false;
    format(media: SplitType): string;
    parse(mime: string): SplitType;
    normalize(type: string): string | false;
    match(types: string[], target: string): string | false;
    private qstring;
    private splitType;
    private tryNormalizeType;
    private mimeMatch;
    private normalizeType;
}
export declare class MimeTypesImpl implements MimeTypes {
    private _json;
    private _form;
    private _text;
    private _xml;
    constructor();
    get json(): string[];
    get form(): string[];
    get text(): string[];
    get xml(): string[];
    append(type: 'json' | 'form' | 'text' | 'xml', mimes: string[]): this;
    private appendTo;
}
