export type Hex = `0x${string}`;

export interface NodeInfo {
  node_name?: string;
  node_id?: string;
  peers_count: Hex;
  channel_count: Hex;
}

export interface Channel {
  channel_id: string;
  pubkey: string;
  state: { state_name: string };
  local_balance: Hex;
  remote_balance: Hex;
  enabled: boolean;
}

export interface NewInvoiceResult {
  invoice_address: string;
  invoice: unknown;
}

export interface PaymentResult {
  payment_hash: string;
  status: string;
}

interface JsonRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export const CKB = 100_000_000n;
export const toHex = (n: bigint): Hex => `0x${n.toString(16)}`;
export const toCkb = (n: bigint): number => Number(n) / Number(CKB);
export const shannonsToCkb = (h: string): number => Number(BigInt(h)) / Number(CKB);
export const ckb = (n: number): bigint => BigInt(n) * CKB;

export class FiberRpc {
  private id = 0;

  constructor(private readonly url: string) {}

  private async call<T>(method: string, params: unknown[] = [{}]): Promise<T> {
    const body = JSON.stringify({ id: ++this.id, jsonrpc: "2.0", method, params });
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
    const json = (await res.json()) as JsonRpcResponse<T>;
    if (json.error) throw new Error(`${method}: ${json.error.message}`);
    return json.result as T;
  }

  nodeInfo(): Promise<NodeInfo> {
    return this.call<NodeInfo>("node_info", []);
  }

  listChannels(): Promise<{ channels: Channel[] }> {
    return this.call<{ channels: Channel[] }>("list_channels", [{}]);
  }

  connectPeer(address: string): Promise<null> {
    return this.call<null>("connect_peer", [{ address }]);
  }

  openChannel(pubkey: string, fundingAmount: bigint): Promise<{ temporary_channel_id: string }> {
    return this.call("open_channel", [{ pubkey, funding_amount: toHex(fundingAmount) }]);
  }

  newInvoice(amount: bigint, description = "fiberfill"): Promise<NewInvoiceResult> {
    return this.call("new_invoice", [
      { amount: toHex(amount), currency: "Fibt", description, hash_algorithm: "sha256" },
    ]);
  }

  sendPayment(invoice: string): Promise<PaymentResult> {
    return this.call("send_payment", [{ invoice }]);
  }

  getPayment(paymentHash: string): Promise<PaymentResult> {
    return this.call("get_payment", [{ payment_hash: paymentHash }]);
  }
}
