"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserCoverageHelper = void 0;
exports.getCoverageHelper = getCoverageHelper;
exports.initBrowserCoverage = initBrowserCoverage;
exports.getBrowserCoverage = getBrowserCoverage;
exports.serializeBrowserCoverage = serializeBrowserCoverage;
exports.resetBrowserCoverage = resetBrowserCoverage;
const globalVar = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
class BrowserCoverageHelper {
    constructor() {
        this.coverageVar = '__coverage__';
        this.listeners = [];
    }
    static getInstance() {
        if (!BrowserCoverageHelper.instance) {
            BrowserCoverageHelper.instance = new BrowserCoverageHelper();
        }
        return BrowserCoverageHelper.instance;
    }
    setCoverageVar(name) {
        this.coverageVar = name;
        this.setupGlobals();
    }
    setupGlobals() {
        if (typeof window !== 'undefined') {
            window.__coverage__ = window.__coverage__ || {};
            window.__coverage_end__ = () => this.onCoverageComplete();
            window.__coverage_reset__ = () => this.reset();
            window.__coverage_serialize__ = () => this.serialize();
        }
    }
    init() {
        this.setupGlobals();
        if (typeof window !== 'undefined') {
            window[this.coverageVar] = window[this.coverageVar] || {};
        }
    }
    reset() {
        if (typeof window !== 'undefined') {
            window[this.coverageVar] = {};
        }
    }
    getCoverage() {
        if (typeof window !== 'undefined') {
            return window[this.coverageVar] || null;
        }
        return null;
    }
    hasCoverage() {
        const coverage = this.getCoverage();
        if (!coverage)
            return false;
        return Object.keys(coverage).length > 0;
    }
    serialize() {
        const coverage = this.getCoverage();
        if (!coverage)
            return '{}';
        return JSON.stringify(coverage);
    }
    onComplete(callback) {
        this.listeners.push(callback);
    }
    onCoverageComplete() {
        const coverage = this.getCoverage();
        this.listeners.forEach(cb => cb(coverage));
    }
    getFileCoverage(path) {
        const coverage = this.getCoverage();
        return coverage ? coverage[path] : null;
    }
    getCoverageSummary() {
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
            if (!file)
                continue;
            const statements = file.s || {};
            for (const key of Object.keys(statements)) {
                totalStatements++;
                if (statements[key] > 0)
                    coveredStatements++;
            }
            const functions = file.f || {};
            for (const key of Object.keys(functions)) {
                totalFunctions++;
                if (functions[key] > 0)
                    coveredFunctions++;
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
    createCoverageReporter(globalName = '__coverage__') {
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
exports.BrowserCoverageHelper = BrowserCoverageHelper;
function getCoverageHelper() {
    return BrowserCoverageHelper.getInstance();
}
function initBrowserCoverage(globalName = '__coverage__') {
    const helper = getCoverageHelper();
    helper.setCoverageVar(globalName);
    helper.init();
}
function getBrowserCoverage() {
    const helper = getCoverageHelper();
    return helper.getCoverage();
}
function serializeBrowserCoverage() {
    const helper = getCoverageHelper();
    return helper.serialize();
}
function resetBrowserCoverage() {
    const helper = getCoverageHelper();
    helper.reset();
}
//# sourceMappingURL=BrowserCoverageHelper.js.map