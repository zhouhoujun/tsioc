import { AssetContext, Incoming, ListenOpts, TransportContext } from '@tsdi/core';


export class MqttContext extends AssetContext {
    get url(): string {
        throw new Error('Method not implemented.');
    }
    set url(value: string) {
        throw new Error('Method not implemented.');
    }
    get method(): string {
        throw new Error('Method not implemented.');
    }
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get request(): any {
        throw new Error('Method not implemented.');
    }
    get response(): any {
        throw new Error('Method not implemented.');
    }
    get sent(): boolean {
        return this.response.sent;
    }
    get status(): any {
        throw new Error('Method not implemented.');
    }
    set status(status: any) {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    set statusMessage(message: string) {
        throw new Error('Method not implemented.');
    }
    set length(n: number | undefined) {
        throw new Error('Method not implemented.');
    }
    get length(): number | undefined {
        throw new Error('Method not implemented.');
    }
    get secure(): boolean {
        throw new Error('Method not implemented.');
    }
    get pathname(): string {
        throw new Error('Method not implemented.');
    }
    get query(): Record<string, any> {
        throw new Error('Method not implemented.');
    }
    get writable(): boolean {
        throw new Error('Method not implemented.');
    }
    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(value: any) {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(ok: boolean) {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | string[] | undefined {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: unknown, val?: unknown): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }
    is(type: string | string[]): string | false | null {
        throw new Error('Method not implemented.');
    }
    get contentType(): string {
        throw new Error('Method not implemented.');
    }
    set contentType(type: string) {
        throw new Error('Method not implemented.');
    }
    set type(type: string) {
        throw new Error('Method not implemented.');
    }
    get type(): string {
        throw new Error('Method not implemented.');
    }
    accepts(...args: string[]): string | false | string[] {
        throw new Error('Method not implemented.');
    }
    acceptsEncodings(...encodings: string[]): string | false | string[] {
        throw new Error('Method not implemented.');
    }
    acceptsCharsets(...charsets: string[]): string | false | string[] {
        throw new Error('Method not implemented.');
    }
    acceptsLanguages(...langs: string[]): string | string[] {
        throw new Error('Method not implemented.');
    }
    attachment(filename: string, options?: { contentType?: string | undefined; type?: string | undefined; fallback?: string | boolean | undefined; } | undefined): void {
        throw new Error('Method not implemented.');
    }
    redirect(url: string, alt?: string | undefined): void {
        throw new Error('Method not implemented.');
    }
    get socket(): any {
        throw new Error('Method not implemented.');
    }


}

const absurl = /^(mqtt|mqtts|tcp|ssl|ws|wss|wx|wxs|alis):\/\//i;
