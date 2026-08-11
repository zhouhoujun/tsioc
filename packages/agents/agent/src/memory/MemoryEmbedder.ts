import { Abstract, Injectable, token } from '@tsdi/ioc';
import { AgentMemoryRecord } from './MemoryStore';

/**
 * DI token used to inject an optional embedding provider.
 *
 * When no provider is registered for this token, semantic search gracefully
 * degrades to the deterministic keyword path instead of failing.
 */
export const MEMORY_EMBEDDER = token<MemoryEmbedder>('MEMORY_EMBEDDER');

/**
 * Optional embedding provider for semantic memory retrieval.
 *
 * Implementations map arbitrary text to a fixed-dimension vector. The exact
 * dimension is an implementation detail; cosine similarity only compares
 * vectors produced by the same embedder instance.
 */
@Abstract()
export abstract class MemoryEmbedder {
    abstract embed(text: string): Promise<number[]>;
}

/**
 * Cosine similarity between two vectors.
 *
 * Returns 0 for empty, mismatched-dimension, or all-zero vectors so callers
 * never have to guard against degenerate inputs.
 */
export function cosineSimilarity(left: number[], right: number[]): number {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) {
        return 0;
    }
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index++) {
        dot += left[index] * right[index];
        leftNorm += left[index] * left[index];
        rightNorm += right[index] * right[index];
    }
    if (leftNorm === 0 || rightNorm === 0) {
        return 0;
    }
    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export interface SemanticRankEntry {
    record: AgentMemoryRecord;
    score: number;
}

export interface SemanticMemoryRankOptions {
    query: string;
    records: AgentMemoryRecord[];
    embedder: MemoryEmbedder;
    topK?: number;
    minScore?: number;
}

/**
 * Ranks memory records against a query by embedding each record's
 * key + value and comparing cosine similarity to the query vector.
 */
@Injectable()
export class SemanticMemoryRanker {
    async rank(options: SemanticMemoryRankOptions): Promise<SemanticRankEntry[]> {
        const queryVector = await options.embedder.embed(options.query);
        const scored: SemanticRankEntry[] = [];
        for (const record of options.records) {
            const vector = await options.embedder.embed(`${record.key}\n${record.value}`);
            const score = cosineSimilarity(queryVector, vector);
            if (options.minScore == null || score >= options.minScore) {
                scored.push({ record, score });
            }
        }
        scored.sort((left, right) => right.score - left.score);
        if (options.topK != null && options.topK > 0) {
            return scored.slice(0, Math.floor(options.topK));
        }
        return scored;
    }
}
