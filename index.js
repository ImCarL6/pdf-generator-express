import express from "express";

import { generatePDF } from "./pdfExtract.js";
const app = express();

const PORT = process.env.PORT || 4000;

app.get("/generate-pdf", (req, res) => {
    const language = req.query.language
    generatePDF(res, language)
});

app.get("/default-pdf", (req, res) => {
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});