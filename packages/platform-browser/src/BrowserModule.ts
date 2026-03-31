import { Module } from '@tsdi/ioc';
import { HrtimeFormatter, ApplicationArguments, AppMode, AppPlatform } from '@tsdi/core';
import { PLATFORM_ID, PLATFORM_BROWSER_ID, DOCUMENT, global } from '@tsdi/common';
import { XhrFactory } from '@tsdi/common/http';
import { BrowserXhr } from './xhr';
import { BrowserHrtimeFormatter } from './hrtime';



const processRoot = global.baseURL || '.';

class BrowserApplicationArguments extends ApplicationArguments {
    private _envOverride: Partial<ApplicationArguments> = {};
    
    get argsSource(): string[] { return []; }
    get args(): Record<string, string> { return {}; }
    get cmds(): string[] { return []; }
    get env(): Record<string, any> { return {}; }
    get signls(): string[] { return []; }
    
    get name(): string { return this._envOverride.name ?? 'browser-app'; }
    get version(): string { return this._envOverride.version ?? '1.0.0'; }
    get mode(): AppMode { return this._envOverride.mode ?? 'production'; }
    get platform(): AppPlatform { return 'browser'; }
    get cwd(): string { return this._envOverride.cwd ?? processRoot; }
    get hostname(): string { return 'browser'; }
    get pid(): number { return 0; }
    get locale(): string { return navigator?.language || 'en-US'; }
    get timezone(): string { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    get debug(): boolean { return this._envOverride.debug ?? false; }
    get logLevel(): string { return this._envOverride.logLevel ?? 'info'; }
    get baseURL(): string { return this._envOverride.baseURL ?? processRoot; }
    
    reset(): void {}
    mergeEnvironment(env: Partial<ApplicationArguments>): void {
        this._envOverride = { ...this._envOverride, ...env };
    }
}

@Module({
    providedIn: 'root',
    providers: [
        { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
        { provide: DOCUMENT, useFactory: () => document },
        { provide: XhrFactory, useClass: BrowserXhr },
        { provide: HrtimeFormatter, useClass: BrowserHrtimeFormatter },
        { provide: ApplicationArguments, useClass: BrowserApplicationArguments }
    ]
})
export class BrowserModule { }

