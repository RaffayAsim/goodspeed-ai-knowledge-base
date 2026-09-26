import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentExtractorService } from './document-extractor.service';
import { RagModule } from '../rag/rag.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RagModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentExtractorService],
  exports: [DocumentsService, DocumentExtractorService],
})
export class DocumentsModule {}
