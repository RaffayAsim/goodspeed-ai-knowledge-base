import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RagModule } from '../rag/rag.module';
import { AuthModule } from '../auth/auth.module';
import { AiProviderModule } from '../ai-provider/ai-provider.module';

@Module({
  imports: [RagModule, AuthModule, AiProviderModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
