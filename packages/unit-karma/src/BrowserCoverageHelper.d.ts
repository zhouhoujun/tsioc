export interface CoverageGlobal {
    __coverage__: any;
}
declare global {
    interface Window {
        __coverage__?: any;
        __coverage_end__?: () => void;
        __coverage_reset__?: () => void;
        __coverage_serialize__?: () => string;
    }
}
export declare class BrowserCoverageHelper {
    private static instance;
    private coverageVar;
    private listeners;
    private constructor();
    static getInstance(): BrowserCoverageHelper;
    setCoverageVar(name: string): void;
    private setupGlobals;
    init(): void;
    reset(): void;
    getCoverage(): any;
    hasCoverage(): boolean;
    serialize(): string;
    onComplete(callback: (coverage: any) => void): void;
    private onCoverageComplete;
    getFileCoverage(path: string): any;
    getCoverageSummary(): any;
    createCoverageReporter(globalName?: string): string;
}
export declare function getCoverageHelper(): BrowserCoverageHelper;
export declare function initBrowserCoverage(globalName?: string): void;
export declare function getBrowserCoverage(): any;
export declare function serializeBrowserCoverage(): string;
export declare function resetBrowserCoverage(): void;
