import fs from 'fs';
import { z } from 'zod';
import yaml from 'yaml';
import { Netmask } from 'netmask';

const ConfigSchema = z.object({
  subnet: z.string().refine(
    val => {
      try {
        new Netmask(val); // Validate subnet format
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid subnet format' },
  ),
  localIp: z.string().ip(),
  lockTimeout: z.number().int().positive(),
  logFilePath: z.string().nonempty(),
  appPort: z.number().int().positive().min(1024).max(65535),
  rpcPort: z.number().int().positive().min(1024).max(65535),
});

function loadConfig(filePath: string) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const config = yaml.parse(fileContent);
    const parsedConfig = ConfigSchema.parse({ ...config, localIp: process.env.ip });

    const subnet = new Netmask(parsedConfig.subnet);

    if (!subnet.contains(parsedConfig.localIp)) throw new Error('Local IP is not in subnet');

    return {
      ...parsedConfig,
      subnet,
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
