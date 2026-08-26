
require('dotenv').config();
const prisma = require('../config/prisma');
const crypto = require('crypto');
const dayjs = require("dayjs");
const isoWeek = require("dayjs/plugin/isoWeek");
dayjs.extend(isoWeek);


const { parseCSV, parseExcel, parsePDF, parseImage } = require('../utils/parser.js');
const {
  isExpenseCategory,
  normalizeCategory,
  predictCategories,
} = require('../utils/category.js');

function applyPredictedCategories(transactions, predictions) {
  return transactions.map((transaction, index) => {
    const prediction =
      predictions.find((item) => Number(item.index) === index) ||
      predictions[index];

    return {
      ...transaction,
      category: normalizeCategory(prediction?.category || transaction.category),
    };
  });
}

function toDatabaseTransaction(transaction, userId, hashes) {
  const amount = Number(transaction.amount);
  const date = new Date(transaction.date || Date.now());
  const category = normalizeCategory(transaction.category);
  const type =
    String(transaction.type || "").toLowerCase() === "credit" || category === "Salary"
      ? "credit"
      : "debit";

  if (!Number.isFinite(amount) || Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    userId,
    date,
    description: transaction.description || "Unknown",
    amount: type === "credit" ? -Math.abs(amount) : Math.abs(amount),
    category,
    imageHash: hashes.imageHash,
    csvHash: hashes.csvHash,
    pdfHash: hashes.pdfHash,
  };
}

function getTransactionType(transaction) {
  if (String(transaction.type || "").toLowerCase() === "credit") {
    return "credit";
  }

  if (Number(transaction.amount) < 0 || normalizeCategory(transaction.category) === "Salary") {
    return "credit";
  }

  return "debit";
}

function toClientTransaction(transaction) {
  const type = getTransactionType(transaction);

  return {
    ...transaction,
    amount: Math.abs(Number(transaction.amount || 0)),
    type,
  };
}

function getTransactionKey(transaction) {
  return [
    dayjs(transaction.date).format("YYYY-MM-DD"),
    String(transaction.description || "").trim().toLowerCase(),
    Math.abs(Number(transaction.amount || 0)).toFixed(2),
  ].join("|");
}

function sumBy(transactions, getKey) {
  return transactions.reduce((totals, transaction) => {
    const key = getKey(transaction);
    totals[key] = (totals[key] || 0) + Math.abs(transaction.amount);
    return totals;
  }, {});
}

function buildSuggestion(categoryData, totalExpense) {
  if (!categoryData.length || totalExpense <= 0) {
    return {
      sector: "None",
      message: "Upload a few expenses to get a focused saving suggestion.",
      tips: ["Add PhonePe receipts or CSV statements to build your spending chart."],
    };
  }

  const topCategory = categoryData[0];
  const percent = Math.round((topCategory.total / totalExpense) * 100);
  const monthlyTarget = Math.round(topCategory.total * 0.85);
  const weeklyTarget = Math.round(monthlyTarget / 4);

  const categoryTips = {
    Food: [
      "Set a weekly food order limit before the week starts.",
      "Move repeat snacks or delivery spends to a fixed grocery budget.",
    ],
    Shopping: [
      "Use a 24-hour wait rule for non-essential purchases.",
      "Keep a monthly shopping cap and stop once the cap is reached.",
    ],
    Grocery: [
      "Plan one weekly grocery list and avoid small repeat top-ups.",
      "Compare bulk items against last month's grocery total.",
    ],
    Transport: [
      "Group nearby trips and track cab spends separately from public transport.",
      "Set a weekly travel ceiling for ride bookings.",
    ],
    Entertainment: [
      "Pause duplicate subscriptions and keep one active service at a time.",
      "Fix a weekend entertainment budget before spending.",
    ],
    Recharge: [
      "Check whether a longer validity plan is cheaper than frequent recharges.",
      "Remove unused add-ons before the next recharge.",
    ],
    Bills: [
      "Review recurring bills and remove services you no longer use.",
      "Move due dates into one reminder list to avoid late fees.",
    ],
    Others: [
      "Rename unclear merchants so future uploads can categorize them better.",
      "Review these transactions manually first because this bucket is too broad.",
    ],
  };

  return {
    sector: topCategory.category,
    percent,
    currentSpend: topCategory.total,
    targetSpend: monthlyTarget,
    message: `${topCategory.category} is your biggest spending sector at ${percent}% of tracked expenses. Try reducing it by 15% to about Rs ${monthlyTarget.toLocaleString("en-IN")} this month.`,
    tips: categoryTips[topCategory.category] || [
      `Keep ${topCategory.category} under about Rs ${weeklyTarget.toLocaleString("en-IN")} per week.`,
      "Review every transaction in this category before adding new spending.",
    ],
  };
}

function buildPeriodSummary(transactions, getPeriod) {
  const groups = {};

  for (const transaction of transactions) {
    const period = getPeriod(transaction);
    const clientTransaction = toClientTransaction(transaction);

    if (!groups[period]) {
      groups[period] = {
        period,
        totalSpend: 0,
        totalCredit: 0,
        transactionCount: 0,
        transactions: [],
      };
    }

    groups[period].transactionCount += 1;
    groups[period].transactions.push(clientTransaction);

    if (clientTransaction.type === "credit") {
      groups[period].totalCredit += clientTransaction.amount;
    } else if (isExpenseCategory(transaction)) {
      groups[period].totalSpend += clientTransaction.amount;
    }
  }

  return Object.values(groups)
    .map((group) => ({
      ...group,
      totalSpend: Number(group.totalSpend.toFixed(2)),
      totalCredit: Number(group.totalCredit.toFixed(2)),
      transactions: group.transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort((a, b) => String(b.period).localeCompare(String(a.period)));
}

function buildAnalytics(transactions) {
  const transactionsWithType = transactions.map((transaction) => ({
    ...transaction,
    type: getTransactionType(transaction),
  }));
  const expenseTransactions = transactionsWithType.filter((transaction) =>
    isExpenseCategory(transaction)
  );
  const typeTotals = sumBy(transactionsWithType, (transaction) =>
    transaction.type === "credit" ? "Credit" : "Debit"
  );
  const dailyTotals = sumBy(expenseTransactions, (transaction) =>
    dayjs(transaction.date).format("YYYY-MM-DD")
  );
  const weeklyTotals = sumBy(expenseTransactions, (transaction) => {
    const d = dayjs(transaction.date);
    return `${d.year()}-W${String(d.isoWeek()).padStart(2, "0")}`;
  });
  const monthlyTotals = sumBy(expenseTransactions, (transaction) =>
    dayjs(transaction.date).format("YYYY-MM")
  );
  const categoryTotals = sumBy(expenseTransactions, (transaction) =>
    normalizeCategory(transaction.category)
  );
  const dailySummary = buildPeriodSummary(transactionsWithType, (transaction) =>
    dayjs(transaction.date).format("YYYY-MM-DD")
  );
  const weeklySummary = buildPeriodSummary(transactionsWithType, (transaction) => {
    const d = dayjs(transaction.date);
    return `${d.year()}-W${String(d.isoWeek()).padStart(2, "0")}`;
  });
  const monthlySummary = buildPeriodSummary(transactionsWithType, (transaction) =>
    dayjs(transaction.date).format("YYYY-MM")
  );

  const dailyData = Object.entries(dailyTotals).map(([date, total]) => ({
    date,
    total: Number(total.toFixed(2)),
  }));
  const weeklyData = Object.entries(weeklyTotals).map(([week, total]) => ({
    week,
    total: Number(total.toFixed(2)),
  }));
  const monthlyData = Object.entries(monthlyTotals).map(([month, total]) => ({
    month,
    total: Number(total.toFixed(2)),
  }));
  const categoryData = Object.entries(categoryTotals)
    .map(([category, total]) => ({
      category,
      total: Number(total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);
  const typeData = Object.entries(typeTotals)
    .map(([type, total]) => ({
      type,
      total: Number(total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);
  const totalExpense = Number(
    categoryData.reduce((sum, item) => sum + item.total, 0).toFixed(2)
  );
  const totalCredit = Number(
    typeData
      .filter((item) => item.type === "Credit")
      .reduce((sum, item) => sum + item.total, 0)
      .toFixed(2)
  );

  return {
    daily: dailyData,
    weekly: weeklyData,
    monthly: monthlyData,
    category: categoryData,
    type: typeData,
    dailySummary,
    weeklySummary,
    monthlySummary,
    dailyTransactions: dailySummary,
    totalExpense,
    totalCredit,
    suggestion: buildSuggestion(categoryData, totalExpense),
  };
}

module.exports.uploadTransactions = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const mime = file.mimetype;
        let transactions = [];
        let imageHash = null;
        let csvHash = null;
        let pdfHash = null;
        let existingImageTransactions = [];

        if (mime === 'text/csv' || mime === 'application/csv') {
            csvHash = crypto.createHash("sha256").update(file.buffer).digest("hex");
            const duplicate = await prisma.transaction.findFirst({
                where: {
                    userId: req.user.id,
                    csvHash,
                },
            });

            if (duplicate) {
                return res.json({
                    success: false,
                    duplicate: true,
                    message: 'Duplicate CSV file detected. This file has already been uploaded.',
                    count: 0,
                    data: [],
                });
            }

            transactions = await parseCSV(file);
        } else if (
            mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) {
            transactions = await parseExcel(file);
        } else if (mime === 'application/pdf') {
            pdfHash = crypto.createHash("sha256").update(file.buffer).digest("hex");
            const duplicate = await prisma.transaction.findFirst({
                where: {
                    userId: req.user.id,
                    pdfHash,
                },
            });

            if (duplicate) {
                return res.json({
                    success: false,
                    duplicate: true,
                    message: 'Duplicate PDF file detected. This file has already been uploaded.',
                    count: 0,
                    data: [],
                });
            }

            transactions = await parsePDF(file);
        } else if (mime.startsWith('image/')) {
            imageHash = crypto.createHash("sha256").update(file.buffer).digest("hex");
            console.log("Image hash:", imageHash);

            existingImageTransactions = await prisma.transaction.findMany({
                where: {
                    userId: req.user.id,
                    imageHash,
                },
            });

            transactions = await parseImage(file);
        } else {
            return res.status(400).json({ message: 'Unsupported file type' });
        }

        if (!transactions.length) {
            return res.status(400).json({ message: 'No valid transactions found in file' });
        }

        const predictions = await predictCategories(transactions);
        const categorizedTransactions = applyPredictedCategories(transactions, predictions);
        let transactionsWithUser = categorizedTransactions
          .map((transaction) =>
            toDatabaseTransaction(transaction, req.user.id, {
              imageHash,
              csvHash,
              pdfHash,
            })
          )
          .filter(Boolean);

        if (imageHash && existingImageTransactions.length) {
          const existingKeys = new Set(existingImageTransactions.map(getTransactionKey));
          transactionsWithUser = transactionsWithUser.filter(
            (transaction) => !existingKeys.has(getTransactionKey(transaction))
          );
        }

        if (!transactionsWithUser.length) {
          if (imageHash && existingImageTransactions.length) {
            return res.json({
                success: false,
                duplicate: true,
                message: 'All transactions from this image are already uploaded.',
                count: 0,
                data: [],
            });
          }

          return res.status(400).json({ message: 'No valid transactions found in file' });
        }

        await prisma.transaction.createMany({
            data: transactionsWithUser,
        });

        return res.json({
            data: transactionsWithUser.map(toClientTransaction),
            success: true,
            count: transactionsWithUser.length,
            predictions,
        })

    }catch(err){
        console.error(err.message);
        return res.status(400).json({ message: err.message || 'Could not upload file' });
    }
};
module.exports.getTransactions = async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
             where: {
        userId: req.user.id,
      },
      orderBy: {
        date: "desc",
      },
    });
 
    res.json({
      success: true,
      data: transactions.map(toClientTransaction),
   
      
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
module.exports.getanalytics = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json({
      success: true,
      ...buildAnalytics(transactions),
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
