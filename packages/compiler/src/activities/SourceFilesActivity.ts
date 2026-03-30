import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';

export interface SourceFile {
    fileName: string;
    filePath: string;
    content: string;
    mtime?: number;
}

@Directive({ selector: 'source-files' })
export class SourceFilesActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
        const filePaths = await globby(patterns, { cwd: process.cwd() });

        const files: SourceFile[] = filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath: path.resolve(filePath),
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));

        return {
            success: true,
            data: { files, count: files.length }
        };
    }
}
