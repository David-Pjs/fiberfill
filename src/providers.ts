import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FiberRpc } from "./rpc";

const REGISTRY_PATH = join(dirname(fileURLToPath(import.meta.url)), "providers.json");

export interface ProviderEntry {
  label: string;
  pubkey: string;
  address: string;
  rpcUrl: string;
  maxOfferCkb: number;
}

export interface ProviderListing extends ProviderEntry {
  online: boolean;
  channelCount: number;
  peersCount: number;
}

function readRegistry(): ProviderEntry[] {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as ProviderEntry[];
}

export async function listProviders(): Promise<ProviderListing[]> {
  const registry = readRegistry();
  return Promise.all(
    registry.map(async (entry) => {
      try {
        const info = await new FiberRpc(entry.rpcUrl).nodeInfo();
        return {
          ...entry,
          online: true,
          channelCount: Number(BigInt(info.channel_count)),
          peersCount: Number(BigInt(info.peers_count)),
        };
      } catch {
        return { ...entry, online: false, channelCount: 0, peersCount: 0 };
      }
    }),
  );
}
