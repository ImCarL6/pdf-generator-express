import { jsPDF } from "jspdf";
import { S3, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { configDotenv } from "dotenv";
import puppeteer from "puppeteer";

configDotenv();

function createUrl(baseUrl, resource) {
  if (resource) {
    return `${baseUrl}/${resource}`;
  }
  return baseUrl;
}

const generatePDF = async (res, language) => {
    try{
        const resumeUrl = createUrl(process.env.RESUME_SITE, language);

        const s3 = new S3({
          credentials: {
            accessKeyId: process.env.AWS_KEY,
            secretAccessKey: process.env.AWS_SECRET,
          },
          region: process.env.AWS_REGION_RESUME,
        });
      
        const browser = await puppeteer.launch({
          args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
          ],
          executablePath:
            process.env.NODE_ENV === "production"
              ? process.env.PUPPETEER_EXECUTABLE_PATH
              : puppeteer.executablePath()
        });
      
        console.log("Puppeteer Connected.");
      
        const page = await browser.newPage();
      
        await page.goto(resumeUrl, {waitUntil: 'domcontentloaded'});
      
        await page.waitForSelector("#bd-container");
        await page.waitForSelector(".home__img");
        await page.waitForSelector("#bd-container");
        await page.waitForSelector("#area-cv");
        
        await page.click('#snow-button')
      
        await page.setViewport({ width: 970, height: 955 });
      
        await page.evaluate(() => {
          const elementsToRemove = document.querySelectorAll(
            ".language-toggle-container"
          );
          elementsToRemove.forEach((element) => element.remove());
        });
      
        await page.evaluate(() => {
          const divToRemove = document.getElementById("tsparticles");
          if (divToRemove) {
            divToRemove.remove();
          }
        });
      
        await page.evaluate(() => {
          const elementsToRemove = document.querySelectorAll("#resume__generate");
          elementsToRemove.forEach((element) => element.remove());
        });
      
        await page.evaluate(() => {
          const elementsToRemove = document.querySelectorAll("#theme-button");
          elementsToRemove.forEach((element) => element.remove());
        });
      
        await page.evaluate(() => {
          const elementsToRemove = document.querySelectorAll("#snow-button");
          elementsToRemove.forEach((element) => element.remove());
        });
      
        const element = await page.$("#area-cv");
      
        const pdf = await element.screenshot({ omitBackground: true });
      
        const pdfFile =
          language === "br"
            ? new jsPDF({ format: [418, 240] })
            : new jsPDF({ format: [405, 240] });
        pdfFile.addImage(pdf, "PNG", 0, 0, 0, 0);
      
        const pdfS3 = Buffer.from(pdfFile.output("arraybuffer"));
      
        await browser.close();
      
        const fileName = uuidv4();
      
        console.log("Inserting PDF into database.");
      
        await s3
          .putObject({
            Bucket: process.env.AWS_BUCKET,
            Key: fileName,
            Body: pdfS3,
            ContentType: "application/pdf",
          })
          .catch((err) => {
            console.error(err);
          });
      
        console.log("Success.");
      
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: fileName,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 }).catch(
          (err) => {
            console.error(err);
            throw new Error("Error");
          }
        );
      
        console.log("URL generated");
      
        res.send(url);
    } catch (err){
        console.log(err)
        res.send(err)
    }
};

export { generatePDF };