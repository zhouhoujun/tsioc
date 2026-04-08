declare const window: any;

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

const globalVar = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {} as any);

export class BrowserCoverageHelper {
    private static instance: BrowserCoverageHelper;
    private coverageVar: string = '__coverage__';
    private listeners: Array<(coverage: any) => void> = [];

    private constructor() {}

    static getInstance(): BrowserCoverageHelper {
        if (!BrowserCoverageHelper.instance) {
            BrowserCoverageHelper.instance = new BrowserCoverageHelper();
        }
        return BrowserCoverageHelper.instance;
    }

    setCoverageVar(name: string): void {
        this.coverageVar = name;
        this.setupGlobals();
    }

    private setupGlobals(): void {
        if (typeof window !== 'undefined') {
            window.__coverage__ = window.__coverage__ || {};
            window.__coverage_end__ = () => this.onCoverageComplete();
            window.__coverage_reset__ = () => this.reset();
            window.__coverage_serialize__ = () => this.serialize();
        }
    }

    init(): void {
        this.setupGlobals();
        if (typeof window !== 'undefined') {
            window[this.coverageVar] = window[this.coverageVar] || {};
        }
    }

    reset(): void {
        if (typeof window !== 'undefined') {
            window[this.coverageVar] = {};
        }
    }

    getCoverage(): any {
        if (typeof window !== 'undefined') {
            return window[this.coverageVar] || null;
        }
        return null;
    }

    hasCoverage(): boolean {
        const coverage = this.getCoverage();
        if (!coverage) return false;
        return Object.keys(coverage).length > 0;
    }

    serialize(): string {
        const coverage = this.getCoverage();
        if (!coverage) return '{}';
        return JSON.stringify(coverage);
    }

    onComplete(callback: (coverage: any) => void): void {
        this.listeners.push(callback);
    }

    private onCoverageComplete(): void {
        const coverage = this.getCoverage();
        this.listeners.forEach(cb => cb(coverage));
    }

    getFileCoverage(path: string): any {
        const coverage = this.getCoverage();
        return coverage ? coverage[path] : null;
    }

    getCoverageSummary(): any {
        const coverage = this.getCoverage();
        if (!coverage) {
            return { total: 0, covered: 0, percentage: 100 };
        }

        let totalStatements = 0;
        let coveredStatements = 0;
        let totalFunctions = 0;
        let coveredFunctions = 0;
        let totalBranches = 0;
        let coveredBranches = 0;

        for (const filePath of Object.keys(coverage)) {
            const file = coverage[filePath];
            if (!file) continue;

            const statements = file.s || {};
            for (const key of Object.keys(statements)) {
                totalStatements++;
                if (statements[key] > 0) coveredStatements++;
            }

            const functions = file.f || {};
            for (const key of Object.keys(functions)) {
                totalFunctions++;
                if (functions[key] > 0) coveredFunctions++;
            }

            const branches = file.b || {};
            for (const key of Object.keys(branches)) {
                const counts = branches[key];
                if (Array.isArray(counts)) {
                    totalBranches += counts.length;
                    coveredBranches += counts.filter(c => c > 0).length;
                }
            }
        }

        return {
            statements: {
                total: totalStatements,
                covered: coveredStatements,
                percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100
            },
            functions: {
                total: totalFunctions,
                covered: coveredFunctions,
                percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 100
            },
            branches: {
                total: totalBranches,
                covered: coveredBranches,
                percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100
            }
        };
    }

    createCoverageReporter(globalName: string = '__coverage__'): string {
        return `
(function(window) {
    window['${globalName}'] = window['${globalName}'] || {};
    
    window.__coverage_reset__ = function() {
        window['${globalName}'] = {};
    };
    
    window.__coverage_serialize__ = function() {
        return JSON.stringify(window['${globalName}'] || {});
    };
    
    window.__coverage_has__ = function() {
        var cov = window['${globalName}'];
        return cov && Object.keys(cov).length > 0;
    };
    
    window.__coverage_get__ = function() {
        return window['${globalName}'] || null;
    };
    
    window.__coverage_onComplete__ = function(callback) {
        if (typeof window.__coverage_end__ === 'function') {
            window.__coverage_end__();
        }
        callback(window['${globalName}'] || {});
    };
})(window);
`;
    }
}

export function getCoverageHelper(): BrowserCoverageHelper {
    return BrowserCoverageHelper.getInstance();
}

export function initBrowserCoverage(globalName: string = '__coverage__'): void {
    const helper = getCoverageHelper();
    helper.setCoverageVar(globalName);
    helper.init();
}

export function getBrowserCoverage(): any {
    const helper = getCoverageHelper();
    return helper.getCoverage();
}

export function serializeBrowserCoverage(): string {
    const helper = getCoverageHelper();
    return helper.serialize();
}

export function resetBrowserCoverage(): void {
    const helper = getCoverageHelper();
    helper.reset();
}
