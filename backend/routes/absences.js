import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Absence from '../models/Absence.js';
import User from '../models/User.js';

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
    
    // Mettre à jour lastActive
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });

    const populatedAbsence = await Absence.findById(newAbsence._id).populate('employeeId', 'username');
    res.status(201).json({ message: 'Absence déclarée avec succès.', absence: populatedAbsence });
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la déclaration.' });
  }
});

// @route   GET /api/absences
// @desc    Voir toutes les absences non archivées (Accessible à tous les employés)
// @access  Privé
router.get('/', protect, async (req, res) => {
    try {
        const absences = await Absence.find({ isArchived: false }).populate('employeeId', 'username').sort({ startDate: -1 });
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

    absence.status = status;
    await absence.save();
    res.json({ message: `Absence mise à jour.` });
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour.' });
  }
});

// @route   PUT /api/absences/:id/archive
// @desc    Archiver une absence
// @access  Privé/Admin
router.put('/:id/archive', [protect, admin], async (req, res) => {
  try {
    const absence = await Absence.findById(req.params.id);
    if (!absence) {
      return res.status(404).json({ message: 'Absence non trouvée.' });
    }
    absence.isArchived = true;
    await absence.save();
    res.json({ message: `Absence archivée.` });
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de l\'archivage.' });
  }
});

export default router;