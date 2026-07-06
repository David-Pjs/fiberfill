import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.argv[2] || "http://127.0.0.1:3001";
const out = process.argv[3] || "shot.png";
const waitMs = Number(process.argv[4] || 3500);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=2"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, waitMs));
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`shot: ${out}`);
