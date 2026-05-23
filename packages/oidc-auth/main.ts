import { bootstrapApplication } from '@tsdi/core';
import { AppModule } from './src/app';

async function main(): Promise<void> {
    try {
        await bootstrapApplication(AppModule);
        console.log('OIDC Auth Service started successfully');
    } catch (err) {
        console.error('Failed to start OIDC Auth Service:', err);
        process.exit(1);
    }
}

main();
