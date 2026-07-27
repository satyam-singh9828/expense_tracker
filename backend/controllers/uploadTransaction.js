
require('dotenv').config();
const prisma = require('../config/prisma');
const crypto = require('crypto');
const dayjs = require("dayjs");
const isoWeek = require("dayjs/plugin/isoWeek");
dayjs.extend(isoWeek);


const { parseCSV, parseExcel, parsePDF, parseImage } = require('../utils/parser.js');
const { predictCategories } = require('../utils/category.js');
module.exports.uploadTransactions = async (req, res) => {
    try {
        const file = req.file;
        console.log(req.file);
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const mime = file.mimetype;
        let transactions = [];
        let imageHash = null;
        let csvHash = null;
        let pdfHash = null;

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

            const duplicate = await prisma.transaction.findFirst({
                where: {
                    userId: req.user.id,
                    imageHash,
                },
            });

            if (duplicate) {
                return res.json({
                    success: false,
                    duplicate: true,
                    message: 'Duplicate image detected. This receipt has already been uploaded.',
                    count: 0,
                    data: [],
                });
            }

            transactions = await parseImage(file);
        } else {
            return res.status(400).json({ message: 'Unsupported file type' });
        }
    console.log("Parsed transactions:", transactions);
        const transactionsWithUser = transactions.map((t) => ({
            ...t,
            userId: req.user.id,
            imageHash,
            csvHash,
            pdfHash,
        }));
        const result = await predictCategories(transactionsWithUser);
        console.log("Predicted categories:", result);

        await prisma.transaction.createMany({
            data: transactionsWithUser,
        });

        console.log("Transactions saved to database:", transactionsWithUser);

        return res.json({
            data: transactionsWithUser,
            success: true,
            count: transactions.length,
        })

    }catch(err){
        console.error(err.message);
        return res.status(500).json({ message: 'Internal server error' });
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
      data: transactions,
   
      
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

    const dailyTotals = {};
    const weeklyTotals = {};
    const monthlyTotals = {};

    for (const t of transactions) {
      const d = dayjs(t.date);
      const date = d.format("YYYY-MM-DD");
      const month = d.format("YYYY-MM");
      const week = `${d.year()}-W${String(d.isoWeek()).padStart(2, "0")}`;

      dailyTotals[date] = (dailyTotals[date] || 0) + t.amount;
      weeklyTotals[week] = (weeklyTotals[week] || 0) + t.amount;
      monthlyTotals[month] = (monthlyTotals[month] || 0) + t.amount;
    }

    const dailyData = Object.entries(dailyTotals).map(([date, total]) => ({
      date,
      total,
    }));

    const weeklyData = Object.entries(weeklyTotals).map(([week, total]) => ({
      week,
      total,
    }));

    const monthlyData = Object.entries(monthlyTotals).map(([month, total]) => ({
      month,
      total,
    }));

    res.json({
      success: true,
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
