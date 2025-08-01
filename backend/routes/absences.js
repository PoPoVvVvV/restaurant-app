import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Absence from '../models/Absence.js';

const router = express.Router();

// @route   POST /api/absences
// @desc    Déclarer une nouvelle absence
// @access  Privé (Employé)
router.post('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const newAbsence = new Absence({
      employeeId: req.user.id,
      startDate,
      endDate,
      reason,
    });
    await newAbsence.save();
    res.status(201).json({ message: 'Absence déclarée avec succès.' });
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la déclaration.' });
  }
});

// @route   GET /api/absences
// @desc    Voir toutes les absences (pour les Admins)
// @access  Privé/Admin
router.get('/', [protect, admin], async (req, res) => {
    try {
        const absences = await Absence.find().populate('employeeId', 'username').sort({ startDate: -1 });
        res.json(absences);
    } catch (error) {
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});

// @route   PUT /api/absences/:id/status
// @desc    Valider ou refuser une absence
// @access  Privé/Admin
router.put('/:id/status', [protect, admin], async (req, res) => {
  try {
    const { status } = req.body;
    const absence = await Absence.findById(req.params.id);

    if (!absence) {
      return res.status(404).json({ message: 'Absence non trouvée.' });
    }

    absence.status = status; // 'Validée' ou 'Refusée'
    await absence.save();
    res.json({ message: `Absence mise à jour.` });
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour.' });
  }
});

export default router;