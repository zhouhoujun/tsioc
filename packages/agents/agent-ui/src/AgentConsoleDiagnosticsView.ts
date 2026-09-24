export function formatSummaryQualityTrend(trend: Array<Record<string, any>>): string[] {
    const byProvider = new Map<string, Array<Record<string, any>>>();
    for (const point of trend) {
        const provider = String(point.provider ?? 'unknown');
        const group = byProvider.get(provider) ?? [];
        group.push(point);
        byProvider.set(provider, group);
    }
    const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const spark = (value: number): string => {
        const index = Math.min(7, Math.max(0, Math.floor((Number(value) || 0) / 100 * 8)));
        return sparkChars[index];
    };
    const lines: string[] = [];
    for (const [provider, points] of byProvider) {
        const sorted = points.slice().sort((a, b) => Number(a.bucketStart ?? 0) - Number(b.bucketStart ?? 0));
        const totals = sorted.map(point => Number(point.avgTotal ?? 0));
        const avgTotal = totals.length
            ? (totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(1)
            : '0.0';
        const fallbackRate = totals.length
            ? (sorted.reduce((sum, point) => sum + Number(point.fallbackRate ?? 0), 0) / sorted.length).toFixed(1)
            : '0.0';
        const evidenceCoverage = totals.length
            ? (sorted.reduce((sum, point) => sum + Number(point.avgEvidenceCoverage ?? 0), 0) / sorted.length).toFixed(1)
            : '0.0';
        const from = Number(sorted[0]?.bucketStart ?? 0);
        const to = Number(sorted[sorted.length - 1]?.bucketStart ?? 0);
        const range = from || to
            ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
            : '';
        lines.push(`${provider} ${sorted.map(point => spark(Number(point.avgTotal ?? 0))).join('')} (${sorted.length}d${range} · avg ${avgTotal} · fb ${fallbackRate}% · evidence ${evidenceCoverage}%)`);
    }
    return lines.sort((a, b) => a.localeCompare(b));
}
