import fs from 'fs';
import { z } from 'zod';
import yaml from 'yaml';
import { address } from 'ip';

const ConfigSchema = z.object({
  myIp: z.string().ip(),
  lockTimeout: z.number().int().positive(),
  appPort: z.number().int().positive().min(1024).max(65535),
  rpcPort: z.number().int().positive().min(1024).max(65535),
});

function loadConfig(filePath: string) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const config = yaml.parse(fileContent);

    const myIp = process.env.ip || address();
    console.log('My IP detected:', myIp);

    const parsedConfig = ConfigSchema.parse({ ...config, myIp });

    return {
      ...parsedConfig,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:', error.errors);
    } else {
      console.error('Error reading configuration file:', error);
    }
    process.exit(1);
  }
}

const config = loadConfig('./config.yml');

export default config;
