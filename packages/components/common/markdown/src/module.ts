import { Module } from '@tsdi/ioc';
import { MarkdownTableComponent, MarkdownCodeComponent } from './markdown';

@Module({
    declarations: [MarkdownTableComponent, MarkdownCodeComponent],
    exports: [MarkdownTableComponent, MarkdownCodeComponent]
})
export class MarkdownModule {}
