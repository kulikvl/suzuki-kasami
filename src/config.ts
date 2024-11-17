import { parseYaml } from './utils';

interface NodeConfig {
  name: string;
  port: number;
  ip: string;
}

interface Config {
  nodes: NodeConfig[];
  self: NodeConfig;
}

function parseConfig(): Config {
  const commonConfig = parseYaml<Config>('config.yml');
  const selfName = process.env.NAME;
  const selfNode = commonConfig.nodes.find(node => node.name === selfName);
  if (!selfNode) {
    throw new Error(`Self node "${selfName}" not found in config`);
  }

  return {
    nodes: commonConfig.nodes.filter(node => node.name !== selfName),
    self: selfNode,
  };
}

export const config = parseConfig();
