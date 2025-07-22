import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import Expense from '../models/Expense.js';
import Setting from '../models/Setting.js';
import { Parser } from 'json2csv';

const router = express.Router();

// Fonction pour calculer l'impôt progressif
const calculateTax = (benefit) => {
  if (benefit <= 10000) return 0;
  
  let tax = 0;
  const brackets = [
    { limit: 10000, rate: 0 },
    { limit: 50000, rate: 0.10 },
    { limit: 100000, rate: 0.19 },
    { limit: 250000, rate: 0.28 },
    { limit: 500000, rate: 0.36 },
    { limit: Infinity, rate: 0.46 },
  ];

  let remainingBenefit = benefit;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (remainingBenefit <= 0) break;
    
    const taxableInBracket = Math.min(remainingBenefit, bracket.limit - previousLimit);
    tax += taxableInBracket * bracket.rate;
    remainingBenefit -= taxableInBracket;
    previousLimit = bracket.limit;
  }

  return tax;
};


// @route   GET /api/reports/financial-summary
// @desc    Obtenir un résumé financier global pour une semaine donnée
// @access  Privé/Admin
router.get('/financial-summary', [protect, admin], async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
      weekIdToFetch = parseInt(req.query.week, 10);
    } else {
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
      weekIdToFetch = weekSetting?.value || 1;
    }

    const prevWeekBalanceSetting = await Setting.findOne({ key: `accountBalance_week_${weekIdToFetch - 1}` });
    const startingBalance = prevWeekBalanceSetting?.value || 0;
    
    const salesData = await Transaction.aggregate([
      { $match: { weekId: weekIdToFetch } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCostOfGoods: { $sum: '$totalCost' } } }
    ]);
    const expenseData = await Expense.aggregate([
      { $match: { weekId: weekIdToFetch } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
    ]);
    const deductibleCategories = ["Matières Premières", "Frais Véhicule", "Frais Avocat"];
    const deductibleExpenseData = await Expense.aggregate([
      { $match: { weekId: weekIdToFetch, category: { $in: deductibleCategories } } },
      { $group: { _id: null, totalDeductible: { $sum: '$amount' } } }
    ]);
    const bonusSetting = await Setting.findOne({ key: 'bonusPercentage' });
    const bonusPercentage = bonusSetting?.value || 0;

    const summary = {
      startingBalance,
      totalRevenue: salesData[0]?.totalRevenue || 0,
      totalCostOfGoods: salesData[0]?.totalCostOfGoods || 0,
      totalExpenses: expenseData[0]?.totalExpenses || 0,
      taxDeductible: deductibleExpenseData[0]?.totalDeductible || 0,
    };
    
    summary.grossMargin = summary.totalRevenue - summary.totalCostOfGoods;
    
    // Le bénéfice pour l'impôt est basé sur le CA moins les dépenses déductibles
    const benefitForTax = summary.totalRevenue - summary.taxDeductible;
    summary.taxPayable = calculateTax(benefitForTax);
    
    summary.netMargin = summary.grossMargin - summary.totalExpenses;
    summary.totalBonus = summary.grossMargin * bonusPercentage;
    summary.liveBalance = summary.startingBalance + summary.netMargin - summary.taxPayable;

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/reports/employee-performance
// @desc    Obtenir le CA, la marge et la prime par employé pour une semaine donnée
// @access  Privé/Admin
router.get('/employee-performance', [protect, admin], async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
      weekIdToFetch = parseInt(req.query.week, 10);
    } else {
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
      weekIdToFetch = weekSetting?.value || 1;
    }
    const performanceData = await Transaction.aggregate([
      { $match: { weekId: weekIdToFetch } },
      { $group: { _id: '$employeeId', totalRevenue: { $sum: '$totalAmount' }, totalMargin: { $sum: '$margin' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employeeInfo' } },
      { $project: { _id: 0, employeeId: '$_id', employeeName: { $arrayElemAt: ['$employeeInfo.username', 0] }, totalRevenue: '$totalRevenue', totalMargin: '$totalMargin' } },
    ]);
    const bonusSetting = await Setting.findOne({ key: 'bonusPercentage' });
    const bonusPercentage = bonusSetting?.value || 0;
    const finalReport = performanceData.map(data => ({
      ...data,
      estimatedBonus: data.totalMargin * bonusPercentage,
    }));
    res.json(finalReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/reports/transactions/export
// @desc    Exporter les transactions de la semaine en cours en CSV
// @access  Privé/Admin
router.get('/transactions/export', [protect, admin], async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
      weekIdToFetch = parseInt(req.query.week, 10);
    } else {
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
      weekIdToFetch = weekSetting?.value || 1;
    }
    const transactions = await Transaction.find({ weekId: weekIdToFetch }).populate('employeeId', 'username').lean();
    const formattedData = transactions.map(t => ({
      date: new Date(t.createdAt).toLocaleString('fr-FR'),
      employe: t.employeeId?.username || 'N/A',
      montant_total: t.totalAmount,
      cout_total: t.totalCost,
      marge: t.margin,
    }));
    const fields = ['date', 'employe', 'montant_total', 'cout_total', 'marge'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedData);
    res.header('Content-Type', 'text/csv');
    res.attachment(`transactions-semaine-${weekIdToFetch}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la génération de l'export." });
  }
});

export default router;