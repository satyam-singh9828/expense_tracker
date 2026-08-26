const path = require("path");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const xlsx = require("xlsx");
const pdfParse = require("pdf-parse");
const tesseract = require("tesseract.js");
const OpenAI = require("openai");
const { classifyCategory, normalizeCategory } = require("./category.js");

dayjs.extend(customParseFormat);

let openAiClient = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openAiClient;
}

function parseJsonArray(text) {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1) {
    return [];
  }

  try {
    const parsed = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseAmountValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const amount = Number.parseFloat(cleaned);

  return Number.isFinite(amount) && amount !== 0 ? Math.abs(amount) : null;
}

function normalizeTransactionType(type) {
  const normalized = String(type || "").trim().toLowerCase();

  if (["credit", "credited", "received", "income", "refund"].includes(normalized)) {
    return "credit";
  }

  return "debit";
}

function detectTransactionType(text) {
  const normalized = String(text || "").toLowerCase();

  if (/received from|credited|credit|refund|cashback|money received/.test(normalized)) {
    return "credit";
  }

  return "debit";
}

function sortTransactionsByDateDesc(transactions) {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const excelDate = xlsx.SSF.parse_date_code(value);
    if (excelDate) {
      return new Date(
        excelDate.y,
        excelDate.m - 1,
        excelDate.d,
        excelDate.H || 0,
        excelDate.M || 0,
        Math.floor(excelDate.S || 0)
      );
    }
  }

  const text = String(value)
    .replace(/\bat\b/gi, " ")
    .replace(/\bon\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const formats = [
    "D MMM YYYY",
    "DD MMM YYYY",
    "D MMMM YYYY",
    "DD MMMM YYYY",
    "MMM D YYYY",
    "MMMM D YYYY",
    "MMM D, YYYY",
    "MMMM D, YYYY",
    "D MMM YYYY h:mm A",
    "DD MMM YYYY h:mm A",
    "MMM D YYYY h:mm A",
    "MMM D, YYYY h:mm A",
    "DD/MM/YYYY",
    "D/M/YYYY",
    "DD-MM-YYYY",
    "D-M-YYYY",
    "YYYY-MM-DD",
    "YYYY/MM/DD",
  ];

  for (const format of formats) {
    const parsed = dayjs(text, format, true);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function cleanOCR(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u20b9|INR/gi, " Rs ")
    .replace(/rs\./gi, " Rs ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getTextFromLines(lines) {
  return lines.join("\n");
}

function isJunkMerchantLine(line) {
  return /phonepe|payment|successful|success|transaction|debited|credited|utr|upi|ref|\bid\b|bank|account|date|time|paid$|^to$|^from$|help|support|powered/i.test(
    line
  );
}

function cleanMerchant(line) {
  return String(line || "")
    .replace(/^paid\s+to\s*/i, "")
    .replace(/^to\s*:?\s*/i, "")
    .replace(/^merchant\s*:?\s*/i, "")
    .replace(/^receiver\s*:?\s*/i, "")
    .replace(/\bupi\b.*$/i, "")
    .replace(/\S+@\S+/g, "")
    .replace(/\+?\d[\d\s-]{7,}/g, "")
    .replace(/[^a-z0-9 &.'-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPhonePeMerchant(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const inlineMatch = line.match(/(?:paid|sent|transferred)\s+to\s+(.+)/i);

    if (inlineMatch) {
      const merchant = cleanMerchant(inlineMatch[1]);
      if (merchant && !isJunkMerchantLine(merchant)) {
        return merchant;
      }
    }

    if (/^(paid|sent|transferred)\s+to$/i.test(line) || /^to:?$/i.test(line)) {
      for (let next = index + 1; next < Math.min(index + 5, lines.length); next += 1) {
        const merchant = cleanMerchant(lines[next]);
        if (merchant && !isJunkMerchantLine(merchant)) {
          return merchant;
        }
      }
    }
  }

  const usefulLine = lines.find((line) => {
    const cleaned = cleanMerchant(line);
    return (
      cleaned.length >= 3 &&
      /[a-z]/i.test(cleaned) &&
      !/\d/.test(cleaned) &&
      !isJunkMerchantLine(cleaned)
    );
  });

  return cleanMerchant(usefulLine) || "PhonePe payment";
}

function getHistoryAmountFromLine(line) {
  if (
    !line ||
    extractDate(line) ||
    /\b(paid to|sent to|received from|refund from|transferred to|debited from|credited to)\b/i.test(
      line
    )
  ) {
    return null;
  }

  const amountMatch = String(line || "").match(
    /(?:Rs\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)\s*$/i
  );

  if (!amountMatch) {
    return null;
  }

  const rawAmount = amountMatch[1].replace(/,/g, "");
  const looksLikeRupeePrefix =
    !/(?:Rs|₹)/i.test(line) && rawAmount.length >= 3 && rawAmount.startsWith("3");
  const normalizedAmount = looksLikeRupeePrefix ? rawAmount.slice(1) : rawAmount;

  return {
    amount: parseAmountValue(normalizedAmount),
    rawAmount,
  };
}

function cleanHistoryMerchantLine(line, rawAmount) {
  return cleanMerchant(String(line || "").replace(new RegExp(`${rawAmount}\\s*$`), ""));
}

function isHistoryActionLine(line) {
  return /\b(paid to|sent to|received from|refund from|transferred to)\b/i.test(line);
}

function isHistoryNoiseLine(line) {
  return (
    !line ||
    /search transactions|home|alerts|history|^\W+$|^\d+\s*$|^to$|^from$|^\|/i.test(line)
  );
}

function looksLikePhonePeHistory(lines) {
  const text = getTextFromLines(lines);
  const actionCount = lines.filter(isHistoryActionLine).length;

  return (
    ((/history|search transactions/i.test(text) && actionCount >= 1) ||
      (/debited from|credited to/i.test(text) && actionCount >= 2))
  );
}

function getHistoryBlock(lines, actionIndex) {
  const nextActionIndex = lines.findIndex(
    (line, index) => index > actionIndex && isHistoryActionLine(line)
  );
  const endIndex =
    nextActionIndex === -1 ? Math.min(lines.length, actionIndex + 8) : nextActionIndex;

  return {
    block: lines.slice(actionIndex, endIndex),
    endIndex,
  };
}

function parsePhonePeHistoryBlock(block) {
  const dateLine = block.find((line) => extractDate(line));
  const date = extractDate(dateLine);

  if (!date) {
    return null;
  }

  let amountLineIndex = -1;
  let amountResult = null;

  for (let index = 1; index < block.length; index += 1) {
    const line = block[index];

    if (isHistoryNoiseLine(line)) {
      continue;
    }

    const result = getHistoryAmountFromLine(line);

    if (result?.amount) {
      amountLineIndex = index;
      amountResult = result;
      break;
    }
  }

  if (!amountResult) {
    return null;
  }

  let description = cleanHistoryMerchantLine(
    block[amountLineIndex],
    amountResult.rawAmount
  );

  if (!description || isJunkMerchantLine(description)) {
    for (let index = amountLineIndex - 1; index > 0; index -= 1) {
      const candidate = cleanMerchant(block[index]);

      if (candidate && !isJunkMerchantLine(candidate) && !extractDate(candidate)) {
        description = candidate;
        break;
      }
    }
  }

  if (!description || isJunkMerchantLine(description)) {
    return null;
  }

  const rowText = block.join(" ");

  return {
    date,
    description,
    amount: amountResult.amount,
    type: detectTransactionType(rowText),
    category: classifyCategory({ description, rawText: rowText }),
  };
}

function parsePhonePeHistory(lines) {
  if (!looksLikePhonePeHistory(lines)) {
    return [];
  }

  const transactions = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!isHistoryActionLine(lines[index])) {
      continue;
    }

    const { block, endIndex } = getHistoryBlock(lines, index);
    const transaction = parsePhonePeHistoryBlock(block);

    if (transaction) {
      transactions.push(transaction);
    }

    index = endIndex - 1;
  }

  return sortTransactionsByDateDesc(transactions);
}

function extractAmount(text) {
  const rupeePatterns = [
    /(?:Rs|rs)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/g,
    /(?:paid|sent|debited|amount)\D{0,12}([0-9][0-9,]*(?:\.\d{1,2})?)/gi,
  ];

  for (const pattern of rupeePatterns) {
    const matches = [...text.matchAll(pattern)]
      .map((match) => parseAmountValue(match[1]))
      .filter(Boolean);

    if (matches.length) {
      return matches[0];
    }
  }

  return null;
}

function extractDate(text) {
  if (!text) {
    return null;
  }

  const datePatterns = [
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*,?\s+\d{4}(?:\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/,
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    const date = match ? normalizeDate(match[0]) : null;
    if (date) {
      return date;
    }
  }

  return null;
}

function parsePhonePeReceipt(lines) {
  const text = getTextFromLines(lines);
  const looksLikePhonePe = /phonepe|transaction id|upi|paid to|debited from|payment successful/i.test(
    text
  );
  const amount = extractAmount(text);

  if (!looksLikePhonePe && !amount) {
    return [];
  }

  if (!amount) {
    return [];
  }

  const description = extractPhonePeMerchant(lines);
  const transaction = {
    date: extractDate(text) || new Date(),
    description,
    amount,
    type: detectTransactionType(text),
    category: classifyCategory({ description, rawText: text }),
  };

  return [transaction];
}

function parseGenericOcr(lines) {
  const text = getTextFromLines(lines);
  const amount = extractAmount(text);

  if (!amount) {
    return [];
  }

  const description = extractPhonePeMerchant(lines);

  return [
    {
      date: extractDate(text) || new Date(),
      description,
      amount,
      type: detectTransactionType(text),
      category: classifyCategory({ description, rawText: text }),
    },
  ];
}

async function parseWithLLM(text) {
  const client = getOpenAIClient();

  if (!client) {
    return [];
  }

  const prompt = `
You are a financial transaction extractor.

Convert this OCR text into a JSON array of transactions.

Rules:
- Return only valid JSON.
- Each item must include amount, description, category, date, type.
- Use positive amount numbers.
- Date must be ISO format or null.
- type must be "debit" for money spent or "credit" for money received.
- Category must be a common expense category.

Text:
${text}
`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_EXTRACT_MODEL || "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Extract structured financial transactions from messy OCR text.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return parseJsonArray(response.choices[0].message.content);
}

function normalizeTransaction(transaction) {
  const amount = parseAmountValue(transaction.amount);
  const date = normalizeDate(transaction.date) || new Date();
  const description =
    transaction.description ||
    transaction.merchant ||
    transaction.payee ||
    transaction.name ||
    "Unknown";

  if (!amount) {
    return null;
  }

  return {
    date,
    description: String(description).trim() || "Unknown",
    amount,
    type: normalizeTransactionType(
      transaction.type || detectTransactionType(transaction.rawText || description)
    ),
    category: normalizeCategory(
      transaction.category ||
        classifyCategory({ description, rawText: transaction.rawText })
    ),
  };
}

function normalizeTransactions(transactions) {
  return transactions.map(normalizeTransaction).filter(Boolean);
}

module.exports.parseCSV = async (file) => {
  const transactions = [];
  const csvText = file.buffer.toString("utf-8");
  const lines = csvText.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("CSV file must have at least 2 rows (header + data)");
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((value) => value.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    const transaction = normalizeTransaction({
      date: row.date || values[0],
      description: row.description || row.merchant || values[1],
      amount: row.amount || values[2],
      category: row.category || values[3],
      type: row.type || row.transactiontype || row["transaction type"] || values[4],
    });

    if (transaction) {
      transactions.push(transaction);
    }
  }

  if (!transactions.length) {
    throw new Error("No valid transactions found in CSV");
  }

  return transactions;
};

module.exports.parseExcel = async (file) => {
  const workbook = xlsx.read(file.buffer, { type: "buffer" });

  if (workbook.SheetNames.length === 0) {
    throw new Error("Excel file contains no sheets");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  if (data.length === 0) {
    throw new Error("No data found in Excel sheet");
  }

  const transactions = normalizeTransactions(
    data.map((row) => ({
      date: row.date || row.Date || row.DATE,
      description:
        row.description ||
        row.Description ||
        row.DESCRIPTION ||
        row.merchant ||
        row.Merchant,
      amount: row.amount || row.Amount || row.AMOUNT,
      category: row.category || row.Category || row.CATEGORY,
      type:
        row.type ||
        row.Type ||
        row.TYPE ||
        row.transactionType ||
        row.TransactionType ||
        row["Transaction Type"],
    }))
  );

  if (!transactions.length) {
    throw new Error("No valid transactions found in Excel");
  }

  return transactions;
};

module.exports.parsePDF = async (file) => {
  try {
    const data = await pdfParse(file.buffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error("No text extracted from PDF");
    }

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const commaRows = lines
      .map((line) => line.split(",").map((part) => part.trim()))
      .filter((parts) => parts.length >= 3);

    const transactions = normalizeTransactions(
      commaRows.map(([date, description, amount, category, type]) => ({
        date,
        description,
        amount,
        category,
        type,
      }))
    );

    if (transactions.length) {
      return transactions;
    }

    const aiTransactions = await parseWithLLM(text);
    const normalizedAiTransactions = normalizeTransactions(aiTransactions);

    if (normalizedAiTransactions.length) {
      return normalizedAiTransactions;
    }

    throw new Error("No valid transactions found in PDF");
  } catch (err) {
    throw new Error(`PDF parsing failed: ${err.message}`, { cause: err });
  }
};

module.exports.parseImage = async (file) => {
  try {
    const result = await tesseract.recognize(file.buffer, "eng", {
      gzip: false,
      langPath: path.resolve(__dirname, ".."),
    });
    const text = result.data.text || "";
    const confidence = result.data.confidence || 0;

    if (!text || text.trim().length === 0) {
      throw new Error("No text recognized from image");
    }

    const cleaned = cleanOCR(text);
    const historyTransactions = parsePhonePeHistory(cleaned);

    if (historyTransactions.length) {
      return historyTransactions;
    }

    const receiptTransactions = parsePhonePeReceipt(cleaned);

    if (receiptTransactions.length) {
      return receiptTransactions;
    }

    const genericTransactions = parseGenericOcr(cleaned);

    if (genericTransactions.length && confidence >= 35) {
      return genericTransactions;
    }

    const aiTransactions = await parseWithLLM(text);
    const normalizedAiTransactions = normalizeTransactions(aiTransactions);

    if (normalizedAiTransactions.length) {
      return normalizedAiTransactions;
    }

    if (genericTransactions.length) {
      return genericTransactions;
    }

    throw new Error("Could not find amount and merchant in image");
  } catch (err) {
    throw new Error(`Image parsing failed: ${err.message}`, { cause: err });
  }
};
