import { Module, Global } from '@nestjs/common';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Global()
@Module({
  providers: [
    OpenAiCompatibleProvider,
    {
      provide: 'IAiProvider',
      useExisting: OpenAiCompatibleProvider,
    },
  ],
  exports: [OpenAiCompatibleProvider, 'IAiProvider'],
})
export class AiProviderModule {}
