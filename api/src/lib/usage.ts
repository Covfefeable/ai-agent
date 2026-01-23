import { PassThrough } from 'stream';
import { db } from '../db';
import { userUsage, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';

export function createUsageLogStream(userId: string, userRole: string, source: string, multiplier: number = 1.0) {
  const logStream = new PassThrough();
  let buffer = '';

  const processLine = async (line: string) => {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6);
        // Sometimes Dify sends "data: [DONE]" or similar non-JSON
        if (jsonStr.trim() === '[DONE]') return;
        
        const data = JSON.parse(jsonStr);
        if (data.event === 'message_end' && data.metadata?.usage) {
          const usage = data.metadata.usage;
          
          // Calculate points using Decimal.js
          // Formula: ((prompt_tokens * 0.5) + completion_tokens) * multiplier / 2000
          const promptTokens = new Decimal(usage.prompt_tokens);
          const completionTokens = new Decimal(usage.completion_tokens);
          const mult = new Decimal(multiplier);
          
          const points = promptTokens.times(0.5)
            .plus(completionTokens)
            .times(mult)
            .dividedBy(2000)
            .toFixed(2);

          // Record usage
          await db.insert(userUsage).values({
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
            multiplier: multiplier,
            calculatedPoints: points,
          });

          // Deduct balance for regular members
          if (userRole === 'member') {
             await db.update(users)
               .set({ 
                 balance: sql`${users.balance} - ${points}` 
               })
               .where(eq(users.id, userId));
          }
        }
      } catch (e) {
        console.error('Error processing usage line:', e);
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
