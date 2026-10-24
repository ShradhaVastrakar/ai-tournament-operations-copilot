export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendOrigin: string;
  aiServiceUrl: string;
  bodyLimit: string;
}

export function getConfig(): AppConfig {
  const required = ['FRONTEND_ORIGIN', 'AI_SERVICE_URL'] as const;
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}. Check .env.example.`);
    }
  }

  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendOrigin: process.env.FRONTEND_ORIGIN!,
    aiServiceUrl: process.env.AI_SERVICE_URL!,
    bodyLimit: process.env.BODY_LIMIT ?? '1mb',
  };
}
