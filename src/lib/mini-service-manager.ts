/**
 * Mini-service manager — keeps the sandbox companion services running.
 *
 * The mini-services live in /mini-services (separate bun projects). In this
 * sandbox environment, processes spawned from short-lived shells are reaped,
 * so we spawn them as children of the long-lived Next.js server instead.
 *
 * Starting is IDEMPOTENT: each service is only spawned when its port is not
 * listening, so it is safe to call on every request / server boot.
 */
import { spawn } from 'child_process';
import net from 'net';
import path from 'path';

export interface MiniServiceDef {
  name: string;
  dir: string;
  port: number;
  cmd: string;
  args: string[];
}

export const MINI_SERVICES: MiniServiceDef[] = [
  { name: 'pyrolysis-simulator', dir: 'pyrolysis-simulator', port: 3031, cmd: 'bun', args: ['--hot', 'index.ts'] },
  { name: 'awd-simulator', dir: 'awd-simulator', port: 3032, cmd: 'bun', args: ['--hot', 'index.js'] },
  { name: 'lidar-simulator', dir: 'lidar-simulator', port: 3033, cmd: 'bun', args: ['--hot', 'index.ts'] },
  { name: 'bio-simulator', dir: 'bio-simulator', port: 3034, cmd: 'bun', args: ['--hot', 'index.ts'] },
  { name: 'iot-gateway', dir: 'iot-gateway', port: 3035, cmd: 'bun', args: ['index.ts'] },
];

const MINI_SERVICES_ROOT = path.join(process.cwd(), 'mini-services');
const spawned = new Set<string>();

/** Resolve when the TCP port on localhost is connectable. */
function isPortListening(port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, '127.0.0.1');
  });
}

/** Spawn one mini-service (logs stream to /tmp/<name>.log). */
function spawnService(svc: MiniServiceDef): void {
  if (spawned.has(svc.name)) return;
  spawned.add(svc.name);
  const log = spawn('sh', ['-c', `exec ${svc.cmd} ${svc.args.join(' ')} >> /tmp/${svc.name}.log 2>&1`], {
    cwd: path.join(MINI_SERVICES_ROOT, svc.dir),
    stdio: 'ignore',
    env: { ...process.env, PORT: String(svc.port) },
  });
  log.on('exit', () => spawned.delete(svc.name));
  log.unref();
}

export interface ServiceStatus {
  name: string;
  port: number;
  running: boolean;
  started?: boolean;
}

/** Check status of every mini-service (no side effects). */
export async function serviceStatuses(): Promise<ServiceStatus[]> {
  return Promise.all(
    MINI_SERVICES.map(async (svc) => ({
      name: svc.name,
      port: svc.port,
      running: await isPortListening(svc.port),
    })),
  );
}

/** Ensure every mini-service is running. Safe to call repeatedly. */
export async function ensureMiniServices(): Promise<ServiceStatus[]> {
  const results = await Promise.all(
    MINI_SERVICES.map(async (svc): Promise<ServiceStatus> => {
      const running = await isPortListening(svc.port);
      if (running) return { name: svc.name, port: svc.port, running, started: false };
      spawnService(svc);
      // give the service a moment to boot, then re-check
      await new Promise((r) => setTimeout(r, 1500));
      const up = await isPortListening(svc.port);
      return { name: svc.name, port: svc.port, running: up, started: true };
    }),
  );
  return results;
}
