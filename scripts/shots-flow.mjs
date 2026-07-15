import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = process.argv[2] || "http://127.0.0.1:3000";
const outDir = process.argv[3] || "docs/screenshots";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=2"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1400, deviceScaleFactor: 2 });
await page.goto(base, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Request"),
  );
  if (btn && !btn.disabled) {
    btn.click();
    return true;
  }
  return false;
});
if (!clicked) {
  console.error("FAIL: Request button not clickable (node may not be empty)");
  await browser.close();
  process.exit(1);
}
const t0 = Date.now();
const at = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
console.log(`clicked Request at ${at()}`);

const readPage = () =>
  page.evaluate(() => {
    const bal = document.querySelector(".balance");
    const text = document.body.innerText;
    return {
      balance: bal ? parseFloat(bal.textContent) : null,
      ready: text.includes("ChannelReady"),
      paid: /paid|Success/i.test(text),
    };
  });

// Beat 1: channel negotiation visible on screen (past the handshake retries).
let shotNegotiating = false;
// Beat 2: the finish.
let done = false;
const deadline = Date.now() + 300000;

while (Date.now() < deadline && !done) {
  await new Promise((r) => setTimeout(r, 2000));
  const s = await readPage();

  if (!shotNegotiating && s.ready) {
    await page.screenshot({ path: `${outDir}/02-channel-opening.png`, fullPage: true });
    console.log(`captured 02-channel-opening at ${at()} (ChannelReady on screen)`);
    shotNegotiating = true;
  }

  done = s.paid && s.balance > 0;
}

await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${outDir}/03-paid.png`, fullPage: true });
const final = await readPage();
console.log(`captured 03-paid at ${at()} | done=${done} balance=${final.balance}`);

await browser.close();
process.exit(done ? 0 : 1);
