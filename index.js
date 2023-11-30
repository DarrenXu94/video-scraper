const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function getHighlightClips(url) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
  });
  const page = await browser.newPage();
  // await page.setViewport({ width: 19800, height: 1080 });

  await page.goto(url, { waitUntil: "networkidle2" });
  await autoScroll(page);

  // Get the HTML content after the page is fully loaded
  const html = await page.content();

  // Load the HTML content into Cheerio
  const $ = cheerio.load(html);

  // Select all video elements within the specified class selector
  const highlightClips = $(".highlightclips video");

  // Extract information about each video element
  const videos = highlightClips
    .map((index, element) => {
      const videoSrc = $(element).attr("src");

      return {
        src: videoSrc,
      };
    })
    .get();

  await browser.close();

  return videos;
}

// Read the URL from the command line arguments
const args = process.argv.slice(2);
const websiteUrl = args[0];

// Check if the URL is provided
if (!websiteUrl) {
  console.error("Please provide a website URL as a command line argument.");
  process.exit(1);
}

const addAllVideosToIndexPage = (urls) => {
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Video Index</title>
  </head>
  <body>
      <div>
          ${urls
            .map(
              (url) =>
                `<div><video controls><source src="${url}" type="video/mp4"></video></div>`
            )
            .join("\n")}
      </div>
  </body>
  </html>
`;

  // Write the HTML content to a file named index.html
  fs.writeFileSync("index.html", htmlContent);
};

getHighlightClips(websiteUrl)
  .then(async (videos) => {
    const filtered = videos.filter((e) => e.src).map((e) => e.src);
    console.log("Highlight Clips:", filtered);
    // openUrlsInPuppeteerTabs(filtered);
    addAllVideosToIndexPage(filtered);
  })
  .catch((error) => {
    console.error("Script failed:", error.message);
  });
