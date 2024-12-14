import { Netmask } from 'netmask';
import net from 'net';

export async function scanSubnetForActiveHosts(
  subnet: Netmask,
  localIp: string,
  port: number,
  timeout: number,
) {
  const activeIps: string[] = [];

  const allIps: string[] = [];
  subnet.forEach(ip => allIps.push(ip));

  const isPortOpen = async (ip: string) =>
    new Promise(resolve => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket
        .on('connect', () => {
          socket.destroy(); // Clean up after successful connection
          resolve(true);
        })
        .on('timeout', () => {
          socket.destroy();
          resolve(false);
        })
        .on('error', () => {
          socket.destroy();
          resolve(false);
        })
        .connect(port, ip);
    });

  await Promise.all(
    allIps.map(async ip => {
      if (ip === localIp) return;
      const isActive = await isPortOpen(ip);
      if (isActive) activeIps.push(ip);
    }),
  );

  return activeIps;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
