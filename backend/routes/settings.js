import express from 'express';
import axios from 'axios';
import { protect, admin } from '../middleware/auth.js';
import Setting from '../models/Setting.js';
import Transaction from '../models/Transaction.js';
import Expense from '../models/Expense.js';
import User from '../models/User.js';

const router = express.Router();

// @route   GET /api/settings/delivery-status
// @desc    Obtenir le statut de l'annonce de livraison
// @access  Privé
router.get('/delivery-status', protect, async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'deliveryStatus' });
    if (!setting) {
      return res.json({ value: { isActive: false, companyName: '' } });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   GET /api/settings/:key
// @desc    Obtenir un paramètre par sa clé
// @access  Privé
router.get('/:key', protect, async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) {
      if (req.params.key === 'currentWeekId') {
        return res.json({ key: 'currentWeekId', value: 1 });
      }
      if (req.params.key.startsWith('accountBalance_week_')) {
          return res.json({ key: req.params.key, value: 0 });
      }
      return res.status(404).json({ message: 'Paramètre non trouvé.' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/settings/account-balance
// @desc    Mettre à jour le solde du compte pour une semaine spécifique
// @access  Privé/Admin
router.post('/account-balance', [protect, admin], async (req, res) => {
  const { balance, week } = req.body;
  try {
    if (!week) {
        return res.status(400).json({ message: 'Le numéro de semaine est manquant.'});
    }
    await Setting.findOneAndUpdate(
      { key: `accountBalance_week_${week}` },
      { value: parseFloat(balance) },
      { new: true, upsert: true }
    );
    res.json({ message: 'Solde du compte mis à jour.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/settings/delivery-status
// @desc    Mettre à jour le statut de l'annonce de livraison
// @access  Privé/Admin
router.post('/delivery-status', [protect, admin], async (req, res) => {
  const { isActive, companyName } = req.body;
  try {
    const deliveryStatus = { isActive, companyName };
    await Setting.findOneAndUpdate(
      { key: 'deliveryStatus' },
      { value: deliveryStatus },
      { new: true, upsert: true }
    );
    res.json({ message: 'Statut de livraison mis à jour.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/settings/new-week
// @desc    Clôture la semaine, envoie le rapport sur Discord, et commence la nouvelle semaine
// @access  Privé/Admin
router.post('/new-week', [protect, admin], async (req, res) => {
    try {
      let setting = await Setting.findOne({ key: 'currentWeekId' });
      const weekToClose = setting?.value || 1;

      // Calcul du résumé de la semaine
      const salesData = await Transaction.aggregate([ { $match: { weekId: weekToClose } }, { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCostOfGoods: { $sum: '$totalCost' } } } ]);
      const expenseData = await Expense.aggregate([ { $match: { weekId: weekToClose } }, { $group: { _id: null, totalExpenses: { $sum: '$amount' } } } ]);
      const summary = {
          totalRevenue: salesData[0]?.totalRevenue || 0,
          totalCostOfGoods: salesData[0]?.totalCostOfGoods || 0,
          totalExpenses: expenseData[0]?.totalExpenses || 0,
      };
      summary.netMargin = summary.totalRevenue - summary.totalCostOfGoods - summary.totalExpenses;

      // Envoi sur Discord
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
          const embed = {
              title: `Résumé Financier - Semaine ${weekToClose}`,
              color: summary.netMargin > 0 ? 5763719 : 15548997,
              fields: [
                  { name: "Chiffre d'Affaires", value: `$${summary.totalRevenue.toFixed(2)}`, inline: true },
                  { name: "Coût Marchandises", value: `-$${summary.totalCostOfGoods.toFixed(2)}`, inline: true },
                  { name: "Autres Dépenses", value: `-$${summary.totalExpenses.toFixed(2)}`, inline: true },
                  { name: "Marge Nette", value: `**$${summary.netMargin.toFixed(2)}**`, inline: false },
              ],
              timestamp: new Date().toISOString(),
          };
          axios.post(webhookUrl, { embeds: [embed] }).catch(err => console.error("Erreur Webhook Discord:", err.message));
      }

      // Ajout des salaires fixes comme dépense pour la nouvelle semaine
      const nextWeekId = (setting?.value || 0) + 1;
      const highLevelStaff = await User.find({ grade: { $in: ['Patron', 'Co-Patronne'] } });
      for (const staff of highLevelStaff) {
        const salaryExpense = new Expense({
          weekId: nextWeekId,
          amount: 20000,
          category: 'Salaires',
          description: `Salaire fixe pour ${staff.username} (Grade: ${staff.grade})`,
          addedBy: req.user.id
        });
        await salaryExpense.save();
      }
      
      // Passage à la semaine suivante
      if (!setting) {
        setting = new Setting({ key: 'currentWeekId', value: 1 });
      }
      setting.value = nextWeekId;
      await setting.save();
      
      res.json({ message: `Semaine ${setting.value} commencée !`, newWeekId: setting.value });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur du serveur' });
    }
});

// @route   POST /api/settings
// @desc    Créer ou mettre à jour un paramètre générique (ex: bonusPercentage)
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  const { key, value } = req.body;
  try {
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;