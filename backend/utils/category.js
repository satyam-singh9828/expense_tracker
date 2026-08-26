const OpenAI = require("openai");

const ALLOWED_CATEGORIES = [
  "Food",
  "Shopping",
  "Grocery",
  "Transport",
  "Medical",
  "Entertainment",
  "Bills",
  "Education",
  "Travel",
  "Recharge",
  "Investment",
  "Salary",
  "Rent",
  "Utilities",
  "Insurance",
  "Others",
];

const CATEGORY_ALIASES = {
  food: "Food",
  foods: "Food",
  restaurant: "Food",
  shopping: "Shopping",
  groceries: "Grocery",
  grocery: "Grocery",
  transport: "Transport",
  travel: "Travel",
  medical: "Medical",
  medicine: "Medical",
  entertainment: "Entertainment",
  bills: "Bills",
  bill: "Bills",
  education: "Education",
  recharge: "Recharge",
  investment: "Investment",
  investments: "Investment",
  income: "Salary",
  salary: "Salary",
  rent: "Rent",
  utilities: "Utilities",
  utility: "Utilities",
  insurance: "Insurance",
  others: "Others",
  other: "Others",
};

const CATEGORY_RULES = [
  {
    category: "Food",
    keywords:
      /swiggy|zomato|restaurant|cafe|coffee|tea|pizza|domino|kfc|mcdonald|burger|food|canteen|bakery|eatery|dining/i,
  },
  {
    category: "Grocery",
    keywords:
      /grocery|bigbasket|blinkit|grofers|zepto|dmart|d-mart|jiomart|reliance fresh|supermarket|kirana|mart/i,
  },
  {
    category: "Transport",
    keywords:
      /uber|ola|rapido|metro|bus|cab|auto|taxi|fuel|petrol|diesel|parking|toll|fastag/i,
  },
  {
    category: "Shopping",
    keywords:
      /amazon|flipkart|myntra|ajio|meesho|nykaa|shopping|store|mall|fashion|clothes|apparel|electronics/i,
  },
  {
    category: "Medical",
    keywords:
      /pharmacy|apollo|medplus|doctor|hospital|clinic|medical|medicine|diagnostic|health/i,
  },
  {
    category: "Entertainment",
    keywords:
      /netflix|hotstar|prime video|spotify|bookmyshow|pvr|cinema|movie|game|gaming|entertainment/i,
  },
  {
    category: "Recharge",
    keywords:
      /recharge|prepaid|mobile recharge|jio recharge|airtel recharge|vi recharge|vodafone|vodafoneidea|idea cellular|bsnl/i,
  },
  {
    category: "Bills",
    keywords:
      /electricity|water bill|gas bill|broadband|internet bill|postpaid|dth|bill payment|utility bill/i,
  },
  {
    category: "Education",
    keywords:
      /school|college|university|course|tuition|class|exam|book|education|udemy|coursera/i,
  },
  {
    category: "Travel",
    keywords:
      /irctc|railway|train|flight|airline|hotel|make my trip|makemytrip|goibibo|booking|travel/i,
  },
  {
    category: "Investment",
    keywords:
      /mutual fund|sip|zerodha|groww|upstox|stocks|shares|investment|nps|ppf|fd|fixed deposit/i,
  },
  {
    category: "Salary",
    keywords:
      /salary|payroll|credited salary|income|stipend|refund|cashback|received from/i,
  },
  {
    category: "Rent",
    keywords: /rent|landlord|house rent|flat rent|room rent/i,
  },
  {
    category: "Utilities",
    keywords:
      /maintenance|wifi|broadband|internet|lpg|cylinder|water|electricity|utility/i,
  },
  {
    category: "Insurance",
    keywords: /insurance|premium|policy|lic|health cover|term plan/i,
  },
];

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

function normalizeCategory(category) {
  if (!category) return "Others";

  const trimmed = String(category).trim();
  const exact = ALLOWED_CATEGORIES.find(
    (allowed) => allowed.toLowerCase() === trimmed.toLowerCase()
  );

  if (exact) return exact;

  return CATEGORY_ALIASES[trimmed.toLowerCase()] || "Others";
}

function getTransactionText(transaction) {
  if (typeof transaction === "string") return transaction;

  return [
    transaction.description,
    transaction.merchant,
    transaction.payee,
    transaction.note,
    transaction.rawText,
  ]
    .filter(Boolean)
    .join(" ");
}

function classifyCategory(transaction) {
  const existing = normalizeCategory(transaction?.category);
  if (existing !== "Others") {
    return existing;
  }

  const text = getTransactionText(transaction).toLowerCase();
  const matchedRule = CATEGORY_RULES.find((rule) => rule.keywords.test(text));

  return matchedRule ? matchedRule.category : "Others";
}

function buildLocalPredictions(transactions) {
  return transactions.map((transaction, index) => {
    const category = classifyCategory(transaction);

    return {
      id: transaction.id || index + 1,
      index,
      category,
      confidence: category === "Others" ? 55 : 90,
      reason:
        category === "Others"
          ? "No strong merchant keyword matched"
          : "Matched merchant or description keyword",
    };
  });
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

async function predictCategories(transactions) {
  const localPredictions = buildLocalPredictions(transactions);
  const client = getOpenAIClient();

  if (!client) {
    return localPredictions;
  }

  const prompt = `
Categorize each transaction into one of these allowed categories only:
${ALLOWED_CATEGORIES.join(", ")}

Return only a JSON array with: index, category, confidence, reason.

Transactions:
${JSON.stringify(
  transactions.map((transaction, index) => ({
    index,
    description: transaction.description,
    amount: transaction.amount,
    currentCategory: transaction.category,
  })),
  null,
  2
)}
`;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_CATEGORY_MODEL || "gpt-4o-mini",
      input: prompt,
      temperature: 0,
    });

    const aiPredictions = parseJsonArray(response.output_text);

    if (!aiPredictions.length) {
      return localPredictions;
    }

    return localPredictions.map((localPrediction, index) => {
      const aiPrediction =
        aiPredictions.find((item) => Number(item.index) === index) ||
        aiPredictions[index];
      const category = normalizeCategory(aiPrediction?.category);

      return {
        ...localPrediction,
        ...aiPrediction,
        index,
        category:
          category === "Others" && localPrediction.category !== "Others"
            ? localPrediction.category
            : category,
      };
    });
  } catch (err) {
    console.log("Category prediction fallback:", err.message);
    return localPredictions;
  }
}

function isExpenseCategory(transactionOrCategory) {
  if (
    typeof transactionOrCategory === "object" &&
    transactionOrCategory !== null &&
    String(transactionOrCategory.type || "").toLowerCase() === "credit"
  ) {
    return false;
  }

  const category =
    typeof transactionOrCategory === "object" && transactionOrCategory !== null
      ? transactionOrCategory.category
      : transactionOrCategory;

  return !["Salary"].includes(normalizeCategory(category));
}

module.exports = {
  ALLOWED_CATEGORIES,
  classifyCategory,
  isExpenseCategory,
  normalizeCategory,
  predictCategories,
};
