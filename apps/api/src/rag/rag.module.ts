import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { VectorStoreService } from './vector-store.service';

@Module({
  providers: [ChunkingService, VectorStoreService],
  exports: [ChunkingService, VectorStoreService],
})
export class RagModule {}
