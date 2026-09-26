import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.config';
import { SupabaseModule } from './supabase/supabase.module';
import { AiProviderModule } from './ai-provider/ai-provider.module';
import { RagModule } from './rag/rag.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    SupabaseModule,
    AiProviderModule,
    RagModule,
    AuthModule,
    DocumentsModule,
    ChatModule,
  ],
})
export class AppModule {}
