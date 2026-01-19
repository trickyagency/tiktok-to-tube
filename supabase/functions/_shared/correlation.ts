// Shared correlation ID utilities for edge function request tracing

export interface CorrelationContext {
  correlationId: string;
  startTime: number;
  functionName: string;
}

/**
 * Creates a correlation context for request tracing
 * Uses incoming x-correlation-id header if present, otherwise generates a new one
 */
export function createCorrelationContext(
  req: Request, 
  functionName: string
): CorrelationContext {
  const incomingCorrelationId = req.headers.get('x-correlation-id');
  const correlationId = incomingCorrelationId || crypto.randomUUID().slice(0, 8);
  
  return {
    correlationId,
    startTime: Date.now(),
    functionName,
  };
}

/**
 * Structured logging with correlation context
 */
export function log(
  ctx: CorrelationContext, 
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string, 
  data?: Record<string, unknown>
): void {
  const logEntry = {
    correlationId: ctx.correlationId,
    functionName: ctx.functionName,
    level,
    message,
    elapsedMs: Date.now() - ctx.startTime,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Creates headers for passing correlation ID to downstream functions
 */
export function createCorrelationHeaders(ctx: CorrelationContext): Record<string, string> {
  return {
    'x-correlation-id': ctx.correlationId,
  };
}

/**
 * Creates a JSON response with correlation ID included
 */
export function createJsonResponse(
  ctx: CorrelationContext,
  body: Record<string, unknown>,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      ...body,
      correlationId: ctx.correlationId,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': ctx.correlationId,
        ...additionalHeaders,
      },
    }
  );
}

/**
 * Creates an error response with correlation ID
 */
export function createErrorResponse(
  ctx: CorrelationContext,
  error: unknown,
  status: number = 500,
  corsHeaders: Record<string, string> = {}
): Response {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  log(ctx, 'error', 'Request failed', { error: errorMessage, status });
  
  return new Response(
    JSON.stringify({
      error: errorMessage,
      correlationId: ctx.correlationId,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': ctx.correlationId,
        ...corsHeaders,
      },
    }
  );
}

/**
 * Generates an idempotency key for queue operations
 */
export function generateIdempotencyKey(
  userId: string,
  videoId: string,
  channelId: string,
  scheduledFor: string
): string {
  return `${userId}:${videoId}:${channelId}:${scheduledFor}`;
}