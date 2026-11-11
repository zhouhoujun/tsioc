import { runCompiler as runCompilerActivity } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    runCompilerActivity({
        baseURL: __dirname,
        src: ['src/**/*.ts', 'wechat/**/*.ts', 'wecom/**/*.ts', 'qq/**/*.ts', 'feishu/**/*.ts', 'dingtalk/**/*.ts', 'slack/**/*.ts', 'telegram/**/*.ts', 'discord/**/*.ts', 'line/**/*.ts', 'matrix/**/*.ts', 'mattermost/**/*.ts', 'signal/**/*.ts'],
        outDir: '../../dist/agent-channels',
        options: {
            target: 'es2020',
            module: 'commonjs',
            declaration: true,
            sourceMap: true,
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        }
    });
}
