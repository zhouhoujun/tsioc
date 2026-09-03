import { Injectable } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentEvalReportEntity } from '../memory/entities';
import { EvalRun } from './EvalTask';
import { EvalReportStore } from './EvalRunner';

@Injectable()
export class TypeOrmEvalReportStore extends EvalReportStore {
    constructor(private adapter: TypeormAdapter) {
        super();
    }

    async save(run: EvalRun): Promise<void> {
        await this.adapter.getRepository(AgentEvalReportEntity).save({
            id: run.id,
            report: run,
            startedAt: Date.parse(run.startedAt)
        });
    }

    async list(): Promise<EvalRun[]> {
        const rows = await this.adapter.getRepository(AgentEvalReportEntity).find({
            order: { startedAt: 'ASC', id: 'ASC' } as any
        });
        return rows.map(row => row.report as EvalRun);
    }

    async get(id: string): Promise<EvalRun | undefined> {
        const row = await this.adapter.getRepository(AgentEvalReportEntity).findOne({ where: { id } as any });
        return row?.report as EvalRun | undefined;
    }
}
