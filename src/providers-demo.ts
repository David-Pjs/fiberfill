import { listProviders } from "./providers";

const providers = await listProviders();
for (const p of providers) {
  console.log(
    `${p.label} - ${p.online ? "online" : "offline"} - offers up to ${p.maxOfferCkb} CKB inbound - peers=${p.peersCount} channels=${p.channelCount}`,
  );
}
