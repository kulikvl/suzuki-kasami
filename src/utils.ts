import { readFileSync } from 'fs';
import yaml from 'yaml';

export function parseYaml<T>(filePath: string): T {
  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const data = yaml.parse(fileContent) as T;
    return data;
  } catch (e) {
    console.error(`Error parsing yaml file at ${filePath}:`, e);
    throw e;
  }
}
