import type { EvidenceLedger } from './EvidenceLedger';

/** Share of measured evidence entries that were falsified this turn. */
export function computeTurnFalsifyRate(ledger?: EvidenceLedger): number | undefined {
    if (!ledger || ledger.size === 0) {
        return undefined;
    }
    const measured = ledger.entriesFrom(0).filter(entry => entry.status !== 'skipped');
    if (measured.length === 0) {
        return undefined;
    }
    return measured.filter(entry => entry.falsified === true).length / measured.length;
}
