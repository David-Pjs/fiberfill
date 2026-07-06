import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = process.argv[2] || "http://127.0.0.1:3001";
const outDir = process.argv[3] || ".";

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
console.log("clicked Request:", clicked);

// mid-run frame (channel states filling in)
await new Promise((r) => setTimeout(r, 45000));
await page.screenshot({ path: `${outDir}/ff-run-mid.png`, fullPage: true });
console.log("captured mid");

// wait for paid / done, poll for the balance to become non-zero
const deadline = Date.now() + 120000;
let done = false;
while (Date.now() < deadline && !done) {
  await new Promise((r) => setTimeout(r, 4000));
  done = await page.evaluate(() => {
    const bal = document.querySelector(".balance");
    const paid = [...document.querySelectorAll(".event")].some((e) =>
      e.textContent.includes("paid"),
    );
    return paid && bal && parseFloat(bal.textContent) > 0;
  });
}
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: `${outDir}/ff-run-final.png`, fullPage: true });
console.log("captured final, done:", done);

await browser.close();
