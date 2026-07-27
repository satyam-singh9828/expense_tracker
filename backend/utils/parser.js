const csv = require('csv-parser');
const { Readable } = require('stream');
const prisma = require('../config/prisma');
const dayjs = require("dayjs");
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const tesseract = require('tesseract.js');
const OpenAI = require('openai');
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
function extractTransactions(lines) {
  const transactions = [];

  for (let line of lines) {

    const amount = extractAmount(line);
    if (!amount) continue; // skip non-transaction lines

    const date = extractDate(line);
    const description = extractMerchant(line);
    const category = detectCategory(line);

    transactions.push({
      date: date || new Date(),
      description,
      amount,
      category,
    });
  }

  return transactions;
}

function extractMerchant(text) {
  if (!text) return "Unknown";

  return text
    .replace(/₹\s?\d+(\.\d+)?/g, "")   // remove money
    .replace(/\d{1,2}:\d{2}/g, "")      // remove time
    .replace(/[^\w\s]/g, "")            // remove symbols
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

function extractAmount(text) {
  const match = text.match(/(\d+(\.\d{1,2})?)/g);

  if (!match) return null;

  return Number(match[match.length - 1]); // take last number
}
function extractDate(text) {
  const match = text.match(
    /\d{1,2}\s?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s?\d{4}/i
  );

  if (!match) return null;

  return dayjs(match[0], "DD MMM YYYY").toDate();
}
function detectCategory(text) {
  text = text.toLowerCase();

  if (text.match(/swiggy|zomato|restaurant|food/)) return "food";
  if (text.match(/uber|ola|metro|bus/)) return "transport";
  if (text.match(/amazon|flipkart|myntra/)) return "shopping";
  if (text.match(/salary|credit|income/)) return "income";
  if (text.match(/electricity|rent|water/)) return "bills";

  return "others";
}
function cleanOCR(text) {
  return text
    .replace(/[\u20B9₹]/g, "₹")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
}

async function parseWithLLM(text) {
    const prompt =  `
You are a financial transaction extractor.

Convert this messy OCR text into structured JSON array.

RULES:
- Extract: amount, description, category, type (debit/credit), date

- If date not found → null
- If category not clear → "others"
- type = debit if money spent, credit if received
- Return ONLY valid JSON array

TEXT:
${text}
`;
const response = await client.chat.completions.create({
     model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You extract structured financial transactions from messy text."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;

  return JSON.parse(content);
}; 

module.exports.parseCSV = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      const transactions = [];
      const csvText = file.buffer.toString('utf-8');
      const lines = csvText.trim().split('\n');
      
      if (lines.length < 2) {
        return reject(new Error("CSV file must have at least 2 rows (header + data)"));
      }

      // Parse header row
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
      
      console.log("Detected headers:", headers);

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines

          const values = line.split(',').map(v => v.trim());
          
          // Map values to headers
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });

          console.log("Parsed row:", row);

          // Extract values - handle various column name formats
          const dateVal = row.date || row.Date || row.DATE || values[0];
          const descVal = row.description || row.Description || row.DESCRIPTION || values[1];
          const amountVal = row.amount || row.Amount || row.AMOUNT || values[2];
          const categoryVal = row.category || row.Category || row.CATEGORY || values[3];

          if (!dateVal || !descVal || !amountVal) {
            console.warn(`Skipping incomplete row ${i}:`, row);
            continue;
          }

          // Parse date with validation
          const parsedDate = new Date(dateVal);
          if (isNaN(parsedDate.getTime())) {
            throw new Error(`Invalid date format: ${dateVal}`);
          }

          // Parse amount with validation
          const amount = parseFloat(amountVal);
          if (isNaN(amount)) {
            throw new Error(`Invalid amount: ${amountVal}`);
          }

          transactions.push({
            userId: 1,
            date: parsedDate,
            description: descVal || "Unknown",
            amount,
            category: categoryVal || "others",
          });
        } catch (err) {
          console.error(`Row ${i} parsing error:`, err.message, lines[i]);
        }
      }

      if (transactions.length === 0) {
        return reject(new Error("No valid transactions found in CSV"));
      }

      resolve(transactions);
    } catch (err) {
      reject(err);
    }
  });
};
module.exports.parseExcel = async (file) => {
  try {
    const workbook = xlsx.read(file.buffer, { type: "buffer" });

    if (workbook.SheetNames.length === 0) {
      throw new Error("Excel file contains no sheets");
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      throw new Error("No data found in Excel sheet");
    }

    return data.map((row, index) => {
      try {
        // Parse date with validation
        const parsedDate = row.date ? new Date(row.date) : new Date();
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format in row ${index + 1}: ${row.date}`);
        }

        // Parse amount with validation
        const amount = parseFloat(row.amount);
        if (isNaN(amount)) {
          throw new Error(`Invalid amount in row ${index + 1}: ${row.amount}`);
        }

        return {
          userId: 1,
          date: parsedDate,
          description: row.description || "Unknown",
          amount,
          category: row.category || "others",
        };
      } catch (err) {
        console.error(`Row ${index + 1} parsing error:`, err.message, row);
        throw err;
      }
    });
  } catch (err) {
    throw new Error(`Excel parsing failed: ${err.message}`);
  }
};
module.exports.parsePDF = async (file) => {
  try {
    const data = await pdfParse(file.buffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error("No text extracted from PDF");
    }

    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error("PDF contains no readable content");
    }

    // Try to parse as CSV-like format first
    const transactions = [];
    let validTransactions = 0;

    for (const line of lines) {
      try {
        const parts = line.split(",").map((p) => p.trim());

        if (parts.length >= 3) {
          const [date, description, amount, category = "others"] = parts;

          // Validate date
          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            continue; // Skip invalid date rows
          }

          // Validate amount
          const parsedAmount = parseFloat(amount);
          if (isNaN(parsedAmount)) {
            continue; // Skip invalid amount rows
          }

          transactions.push({
            userId: 1,
            date: parsedDate,
            description: description || "Unknown",
            amount: parsedAmount,
            category: category || "others",
          });

          validTransactions++;
        }
      } catch (err) {
        console.error(`PDF line parsing error:`, err.message, line);
        continue;
      }
    }

    // If CSV parsing failed, use LLM to extract transactions
    if (validTransactions === 0) {
      console.log("CSV format parsing failed, using LLM for extraction...");
      return await parseWithLLM(text);
    }

    return transactions;
  } catch (err) {
    console.error("PDF parsing error:", err.message);
    throw new Error(`PDF parsing failed: ${err.message}`);
  }
};
module.exports.parseImage = async (file) => {
  try {
    const result = await tesseract.recognize(file.buffer, "eng");
    const text = result.data.text || "";
    const confidence = result.data.confidence || 0;

    if (!text || text.trim().length === 0) {
      throw new Error("No text recognized from image");
    }

    const cleaned = cleanOCR(text);

    // If confidence is good and we have reasonable content, use regex extraction
    if (cleaned.length > 3 && confidence > 50) {
      const extracted = extractTransactions(cleaned);
      if (extracted.length > 0) {
        return extracted;
      }
    }

    // Fall back to LLM for uncertain or unstructured data
    console.log(`OCR confidence: ${confidence}, using LLM for extraction...`);
    return await parseWithLLM(text);
  } catch (err) {
    console.error("Image parsing error:", err.message);
    throw new Error(`Image parsing failed: ${err.message}`);
  }
};


