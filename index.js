const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

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
    // headless: false,
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

async function openUrlsInPuppeteerTabs(urls) {
  const browser = await puppeteer.launch({ headless: false });

  try {
    // Loop through each URL in the list
    for (let i = urls.length - 1; i >= 0; i--) {
      const url = urls[i];
      try {
        const page = await browser.newPage();

        // Navigate to the URL
        await page.goto(url, { waitUntil: "networkidle2" });

        // Mute all videos on the page
        await page.evaluate(() => {
          const videos = document.querySelectorAll("video");
          videos.forEach((video) => {
            video.muted = true;
            video.autoplay = false;
          });
        });

        // You can add additional logic here to interact with the page if needed

        console.log(`Opened ${url} in a new tab`);

        // Close the page to free up resources
        // await page.close();
      } catch (error) {
        console.error(`Error opening ${url} in a new tab:`, error.message);
      }
    }

    console.log("All URLs opened successfully.");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Close the browser when done
    // await browser.close();
  }
}

// Example usage
getHighlightClips(websiteUrl)
  .then(async (videos) => {
    const filtered = videos.filter((e) => e.src).map((e) => e.src);
    console.log("Highlight Clips:", filtered);
    openUrlsInPuppeteerTabs(filtered);
  })
  .catch((error) => {
    console.error("Script failed:", error.message);
  });
