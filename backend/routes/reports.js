import express from 'express';
import mongoose from 'mongoose';
import { protect, admin } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import Expense from '../models/Expense.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import { Parser } from 'json2csv';

const router = express.Router();

// Fonction pour calculer l'impôt progressif
const calculateTax = (benefit) => {
  if (benefit <= 10000) return 0;
  let tax = 0;
  const brackets = [
    { limit: 10000, rate: 0 }, { limit: 50000, rate: 0.10 }, { limit: 100000, rate: 0.19 },
    { limit: 250000, rate: 0.28 }, { limit: 500000, rate: 0.36 }, { limit: Infinity, rate: 0.46 },
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
    
    const salesData = await Transaction.aggregate([ { $match: { weekId: weekIdToFetch } }, { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCostOfGoods: { $sum: '$totalCost' } } } ]);
    
    const expenseData = await Expense.aggregate([
      { $match: { weekId: weekIdToFetch } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);

    const expensesByCategory = {};
    expenseData.forEach(item => {
      expensesByCategory[item._id] = item.total;
    });

    const deductibleCategories = ["Matières Premières", "Frais Véhicule", "Frais Avocat"];
    let totalExpenses = 0;
    let taxDeductible = 0;
    for (const category in expensesByCategory) {
        totalExpenses += expensesByCategory[category];
        if (deductibleCategories.includes(category)) {
            taxDeductible += expensesByCategory[category];
        }
    }

    const bonusSetting = await Setting.findOne({ key: 'bonusPercentage' });
    const bonusPercentage = bonusSetting?.value || 0;

    const summary = {
      startingBalance,
      totalRevenue: salesData[0]?.totalRevenue || 0,
      totalCostOfGoods: salesData[0]?.totalCostOfGoods || 0,
      totalExpenses,
      taxDeductible,
      expensesBreakdown: expensesByCategory
    };
    
    summary.grossMargin = summary.totalRevenue - summary.totalCostOfGoods;
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
      { $unwind: '$employeeInfo' },
      { 
        $project: {
          _id: 0,
          employeeId: '$_id',
          employeeName: '$employeeInfo.username',
          grade: '$employeeInfo.grade',
          totalRevenue: '$totalRevenue',
          totalMargin: '$totalMargin'
        }
      },
    ]);
    
    const bonusSetting = await Setting.findOne({ key: 'bonusPercentage' });
    const bonusPercentage = bonusSetting?.value || 0;

    const finalReport = performanceData.map(data => {
      let estimatedBonus;
      if (data.grade === 'Patron' || data.grade === 'Co-Patronne') {
        estimatedBonus = 20000;
      } else {
        estimatedBonus = data.totalMargin * bonusPercentage;
      }
      return { ...data, estimatedBonus };
    });

    res.json(finalReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/reports/daily-sales/me
// @desc    Obtenir les ventes journalières de l'employé pour la semaine en cours
// @access  Privé (Employé)
router.get('/daily-sales/me', protect, async (req, res) => {
  try {
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
    const currentWeekId = weekSetting?.value || 1;
    const dailySales = await Transaction.aggregate([
      { $match: { employeeId: new mongoose.Types.ObjectId(req.user.id), weekId: currentWeekId } },
      { $project: { dayOfWeek: { $dayOfWeek: '$createdAt' }, totalAmount: '$totalAmount' } },
      { $group: { _id: '$dayOfWeek', totalSales: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } }
    ]);
    const days = ["", "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const formattedData = dailySales.map(d => ({ name: days[d._id], Ventes: d.totalSales }));
    res.json(formattedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/reports/leaderboard
// @desc    Obtenir le classement des employés par CA pour la semaine en cours
// @access  Privé
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
    const currentWeekId = weekSetting?.value || 1;
    const leaderboard = await Transaction.aggregate([
      { $match: { weekId: currentWeekId } },
      { $group: { _id: '$employeeId', totalRevenue: { $sum: '$totalAmount' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employeeInfo' } },
      { $project: { _id: 0, employeeName: { $arrayElemAt: ['$employeeInfo.username', 0] }, totalRevenue: '$totalRevenue' } },
    ]);
    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/reports/weekly-sales-summary
// @desc    Obtenir le résumé des ventes de la semaine, par jour et par employé
// @access  Privé/Admin
router.get('/weekly-sales-summary', [protect, admin], async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
      weekIdToFetch = parseInt(req.query.week, 10);
    } else {
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
      weekIdToFetch = weekSetting?.value || 1;
    }
    const salesByDay = await Transaction.aggregate([
      { $match: { weekId: weekIdToFetch } },
      { $lookup: { from: 'users', localField: 'employeeId', foreignField: '_id', as: 'employeeInfo' } },
      { $project: { dayOfWeek: { $dayOfWeek: '$createdAt' }, employeeName: { $arrayElemAt: ['$employeeInfo.username', 0] }, totalAmount: '$totalAmount' } },
      { $group: { _id: { day: '$dayOfWeek', employee: '$employeeName' }, totalSales: { $sum: '$totalAmount' } } },
      { $sort: { '_id.day': 1 } }
    ]);
    const days = ["", "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const report = {};
    const employees = new Set();
    salesByDay.forEach(item => {
      const dayName = days[item._id.day];
      const employeeName = item._id.employee;
      if (!report[dayName]) report[dayName] = { name: dayName };
      report[dayName][employeeName] = item.totalSales;
      employees.add(employeeName);
    });
    res.json({ chartData: Object.values(report), employees: Array.from(employees) });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/reports/menu-sales
// @desc    Obtenir les ventes par menu pour une semaine donnée
// @access  Privé/Admin
router.get('/menu-sales', [protect, admin], async (req, res) => {
  try {
    let weekIdToFetch;
    if (req.query.week && !isNaN(parseInt(req.query.week, 10))) {
      weekIdToFetch = parseInt(req.query.week, 10);
    } else {
      const weekSetting = await Setting.findOne({ key: 'currentWeekId' });
      weekIdToFetch = weekSetting?.value || 1;
    }

    // Agrégation pour compter le nombre total de menus vendus par type
    const menuSales = await Transaction.aggregate([
      { $match: { weekId: weekIdToFetch } },
      { $unwind: '$products' },
      { $match: { 'products.category': 'Menus' } },
      {
        $group: {
          _id: '$products.name',
          totalSold: { $sum: 1 }, // Compter le nombre de fois que ce menu a été vendu
          totalQuantity: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.priceAtSale'] } },
          totalCost: { $sum: { $multiply: ['$products.quantity', '$products.costAtSale'] } }
        }
      },
      {
        $project: {
          _id: 0,
          menuName: '$_id',
          count: '$totalSold', // Nombre de fois vendu
          quantity: '$totalQuantity', // Quantité totale
          revenue: '$totalRevenue',
          cost: '$totalCost',
          margin: { $subtract: ['$totalRevenue', '$totalCost'] }
        }
      },
      { $sort: { count: -1 } } // Trier par nombre de ventes
    ]);

    res.json(menuSales);
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