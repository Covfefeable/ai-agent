import { PassThrough } from 'stream';
import { db } from '../db';
import { userUsage } from '../db/schema';

export function createUsageLogStream(userId: string, source: string) {
  const logStream = new PassThrough();
  let buffer = '';

  const processLine = (line: string) => {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6);
        // Sometimes Dify sends "data: [DONE]" or similar non-JSON
        if (jsonStr.trim() === '[DONE]') return;
        
        const data = JSON.parse(jsonStr);
        if (data.event === 'message_end' && data.metadata?.usage) {
          const usage = data.metadata.usage;
          db.insert(userUsage).values({
            userId,
            source,
            promptTokens: usage.prompt_tokens,
            promptUnitPrice: String(usage.prompt_unit_price),
            promptPriceUnit: String(usage.prompt_price_unit),
            promptPrice: String(usage.prompt_price),
            completionTokens: usage.completion_tokens,
            completionUnitPrice: String(usage.completion_unit_price),
            completionPriceUnit: String(usage.completion_price_unit),
            completionPrice: String(usage.completion_price),
            totalTokens: usage.total_tokens,
            totalPrice: String(usage.total_price),
            currency: usage.currency,
            latency: String(usage.latency),
            timeToFirstToken: String(usage.time_to_first_token),
            timeToGenerate: String(usage.time_to_generate),
          }).catch(err => console.error('Failed to record usage:', err));
        }
      } catch (e) {
        // ignore
      }
    }
  };

  logStream.on('data', (chunk: Buffer) => {
    const chunkStr = chunk.toString();
    buffer += chunkStr;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      processLine(line);
    }
  });

  logStream.on('end', () => {
    if (buffer) {
      processLine(buffer);
    }
  });

  return logStream;
}
