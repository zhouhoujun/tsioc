import { EMPTY_OBJ } from '@tsdi/ioc';

export class UdpServRequest {
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;

    body: any;

    private _update: boolean;
    constructor(option: {
        id?: string,
        url?: string;
        body?: any;
        params?: Record<string, any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
        update?: boolean;
    } = EMPTY_OBJ) {
        this.url = option.url ?? '';
        this.method = option.method ?? 'EES';
        this.body = option.body ?? null;
        this.params = option.params ?? {};
        this._update = option.update === true;
    }

    get isUpdate(): boolean {
        return this._update
    }
}

