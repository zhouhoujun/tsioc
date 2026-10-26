/**
 * Review panel meta formatting: the header line, the stats line and the
 * selection line shown above the review transcript. Pure formatting, extracted
 * from `AgentConsolePanels` so both the panel component and its source-size
 * budget stay manageable.
 *
 * The caller supplies `label` (key + English fallback + params) so the copy is
 * resolved through the host translator; ids, paths, statuses/modes and diff text
 * stay untranslated.
 */

export type ReviewMetaLabel = (key: string, fallback: string, params?: Record<string, any>) => string;

export interface ReviewHeaderMeta {
    taskId: string;
    title: string;
    sourceSessionId?: string;
    projectLabel?: string;
    status: string;
    mode: string;
    workerCount: number;
    lineageIndex?: number;
    lineageTotal?: number;
    lineageRootId?: string;
    groupIndex?: number;
    groupTotal?: number;
    groupLabel?: string;
    fileIndex?: number;
    fileTotal?: number;
    filePath?: string;
    start: number;
    end: number;
    total: number;
    column: number;
    totalColumns: number;
}

/** Display label for a review task status (`done` → 已完成), raw when unknown. */
function reviewStatusLabel(status: string, label: ReviewMetaLabel): string {
    if (!status) {
        return '-';
    }
    const key = `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    return label(key, status);
}

export function formatReviewHeaderMeta(meta: ReviewHeaderMeta, label: ReviewMetaLabel): string {
    const group = meta.groupTotal
        ? label('headerGroup', 'group {index}/{total} {label}', { index: meta.groupIndex || 0, total: meta.groupTotal, label: meta.groupLabel || '-' })
        : label('headerGroupNone', 'group -');
    const file = meta.fileTotal
        ? label('headerFile', 'file {index}/{total} {path}', { index: meta.fileIndex || 0, total: meta.fileTotal, path: meta.filePath || '-' })
        : label('headerFileNone', 'file -');
    const lineage = (meta.lineageTotal || 0) > 1 && (meta.lineageIndex || 0) >= 0
        ? (meta.lineageRootId
            ? label('headerLineageRoot', 'lineage {index}/{total} root {root}', { index: (meta.lineageIndex || 0) + 1, total: meta.lineageTotal, root: meta.lineageRootId })
            : label('headerLineage', 'lineage {index}/{total}', { index: (meta.lineageIndex || 0) + 1, total: meta.lineageTotal }))
        : '';
    return label('header', 'review {taskId} {title}{session}{project}  |  {status}  |  {mode}  |  {workers}{lineage}  |  {group}  |  {file}  |  {lines}  |  {columns}', {
        taskId: meta.taskId || '-',
        title: meta.title,
        session: meta.sourceSessionId ? label('headerSession', '  |  session {id}', { id: meta.sourceSessionId }) : '',
        project: meta.projectLabel ? label('headerProject', '  |  project {path}', { path: meta.projectLabel }) : '',
        status: reviewStatusLabel(meta.status, label),
        mode: meta.mode,
        workers: label('headerWorkers', 'workers {count}', { count: meta.workerCount }),
        lineage: lineage ? `  |  ${lineage}` : '',
        group: group,
        file: file,
        lines: label('lines', 'lines {start}-{end} / {total}', { start: meta.start, end: meta.end, total: meta.total }),
        columns: label('columns', 'col {column}/{columns}', { column: meta.column, columns: meta.totalColumns })
    });
}

export interface ReviewStatsMeta {
    status: string;
    mode: string;
    workers: number;
    groups: number;
    files: number;
    rollback: 'available' | 'applied' | 'unavailable';
}

export function formatReviewStatsMeta(meta: ReviewStatsMeta, label: ReviewMetaLabel): string {
    return label('stats', 'status {status} · mode {mode} · workers {workers} · groups {groups} · files {files} · {rollback}', {
        status: reviewStatusLabel(meta.status, label),
        mode: meta.mode,
        workers: meta.workers,
        groups: meta.groups,
        files: meta.files,
        rollback: meta.rollback === 'available'
            ? label('rollbackAvailable', 'rollback available')
            : meta.rollback === 'applied'
                ? label('rollbackApplied', 'rollback applied')
                : label('rollbackUnavailable', 'rollback unavailable')
    });
}

export interface ReviewSelectionMeta {
    lineageIndex?: number;
    lineageTotal?: number;
    lineageRootId?: string;
    groupIndex?: number;
    groupTotal?: number;
    groupLabel?: string;
    fileIndex?: number;
    fileTotal?: number;
    filePath?: string;
    risk?: string;
    start: number;
    end: number;
    total: number;
    column: number;
    totalColumns: number;
}

export function formatReviewSelectionMeta(meta: ReviewSelectionMeta, label: ReviewMetaLabel): string {
    const group = meta.groupTotal
        ? label('headerGroup', 'group {index}/{total} {label}', { index: meta.groupIndex || 0, total: meta.groupTotal, label: meta.groupLabel || '-' })
        : label('headerGroupNone', 'group -');
    const file = meta.fileTotal
        ? label('headerFile', 'file {index}/{total} {path}', { index: meta.fileIndex || 0, total: meta.fileTotal, path: meta.filePath || '-' })
        : label('headerFileNone', 'file -');
    const lineage = (meta.lineageTotal || 0) > 1 && (meta.lineageIndex || 0) >= 0
        ? (meta.lineageRootId
            ? label('headerLineageRoot', 'lineage {index}/{total} root {root}', { index: (meta.lineageIndex || 0) + 1, total: meta.lineageTotal, root: meta.lineageRootId })
            : label('headerLineage', 'lineage {index}/{total}', { index: (meta.lineageIndex || 0) + 1, total: meta.lineageTotal }))
        : '';
    return [
        lineage,
        group,
        file,
        meta.risk ? label('risk', 'risk {level}', { level: meta.risk }) : '',
        label('lines', 'lines {start}-{end} / {total}', { start: meta.start, end: meta.end, total: meta.total }),
        label('columns', 'col {column}/{columns}', { column: meta.column, columns: meta.totalColumns })
    ].filter(Boolean).join(' · ');
}

export interface ReviewGroupMeta {
    label: string;
    kind: string;
    status?: string;
    fileCount: number;
    hasError?: boolean;
}

/** One review group row: `aggregate · 状态 已完成 · 2 个文件有变更`. */
export function formatReviewGroupMeta(group: ReviewGroupMeta, label: ReviewMetaLabel): string {
    return [
        group.label,
        group.kind === 'aggregate' ? 'aggregate' : 'worker',
        group.status
            ? label('statusLabel', 'status {status}', {
                status: label(`status${group.status.charAt(0).toUpperCase()}${group.status.slice(1)}`, group.status)
            })
            : '',
        group.fileCount
            ? label(group.fileCount === 1 ? 'scopeFilesOne' : 'scopeFiles',
                group.fileCount === 1 ? '{count} file changed' : '{count} files changed',
                { count: group.fileCount })
            : '',
        group.hasError ? 'error' : ''
    ].filter(Boolean).join(' · ');
}
