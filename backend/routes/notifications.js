import express from 'express';
import mongoose from 'mongoose';
import { protect, admin } from '../middleware/auth.js';
import AdminNotification from '../models/AdminNotification.js';

const router = express.Router();

const getUserObjectId = (req) => {
  const raw = req.user?.id || req.user?._id;
  if (!raw) return null;
  try {
    return new mongoose.Types.ObjectId(raw);
  } catch {
    return null;
  }
};

// @route   GET /api/notifications
// @desc    Liste des notifications + compteur non lues (par utilisateur)
// @access  Privé
router.get('/', protect, async (req, res) => {
  try {
    const userId = getUserObjectId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur invalide.' });
    }

    const notifications = await AdminNotification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const userIdStr = userId.toString();
    const mapped = (notifications || []).map((n) => {
      const isRead = (n.readBy || []).some((id) => id?.toString?.() === userIdStr);
      return {
        _id: n._id,
        title: n.title || '',
        message: n.message,
        createdAt: n.createdAt,
        isRead,
      };
    });

    const unreadCount = mapped.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0);
    res.json({ notifications: mapped, unreadCount });
  } catch (error) {
    console.error('Erreur GET /api/notifications:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   POST /api/notifications
// @desc    Créer une notification (admin)
// @access  Privé/Admin
router.post('/', [protect, admin], async (req, res) => {
  try {
    const { title, message } = req.body || {};
    const trimmedMessage = String(message || '').trim();
    if (!trimmedMessage) {
      return res.status(400).json({ message: 'Message requis.' });
    }

    const createdBy = getUserObjectId(req);
    const notification = await AdminNotification.create({
      title: String(title || '').trim(),
      message: trimmedMessage,
      createdBy: createdBy || undefined,
    });

    // Notifier les clients pour rafraîchir la Navbar
    req.io?.emit('data-updated', { type: 'NOTIFICATIONS_UPDATED' });

    res.status(201).json({
      message: 'Notification créée.',
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      },
    });
  } catch (error) {
    console.error('Erreur POST /api/notifications:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Marquer une notification comme lue (par utilisateur)
// @access  Privé
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const userId = getUserObjectId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur invalide.' });
    }

    const updated = await AdminNotification.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { readBy: userId } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Notification non trouvée.' });
    }

    // Recalcul simple du compteur (dataset petit)
    const all = await AdminNotification.find().select('readBy').lean();
    const userIdStr = userId.toString();
    const unreadCount = (all || []).reduce((acc, n) => {
      const isRead = (n.readBy || []).some((id) => id?.toString?.() === userIdStr);
      return acc + (isRead ? 0 : 1);
    }, 0);

    res.json({ message: 'Marquée comme lue.', unreadCount });
  } catch (error) {
    console.error('Erreur PATCH /api/notifications/:id/read:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// @route   PATCH /api/notifications/read-all
// @desc    Marquer toutes les notifications comme lues (par utilisateur)
// @access  Privé
router.patch('/read-all', protect, async (req, res) => {
  try {
    const userId = getUserObjectId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur invalide.' });
    }

    await AdminNotification.updateMany({}, { $addToSet: { readBy: userId } });
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.', unreadCount: 0 });
  } catch (error) {
    console.error('Erreur PATCH /api/notifications/read-all:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;
