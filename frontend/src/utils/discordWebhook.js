import api from '../services/api';

// frontend/src/utils/discordWebhook.js

// Clé de stockage pour l'URL du webhook
const WEBHOOK_STORAGE_KEY = 'tombola_discord_webhook';

// Délai entre les requêtes pour éviter le rate limiting (en ms)
const RATE_LIMIT_DELAY = 1000;

/**
 * Récupère l'URL du webhook depuis le stockage local
 * @returns {string} L'URL du webhook ou une chaîne vide si non défini
 */
export const getWebhookUrl = () => {
  try {
    return localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
  } catch (error) {
    console.error('Erreur lors de la récupération du webhook:', error);
    return '';
  }
};

/**
 * Définit l'URL du webhook dans le stockage local
 * @param {string} url - L'URL du webhook à enregistrer
 * @returns {boolean} true si l'opération a réussi
 */
export const setWebhookUrl = (url) => {
  try {
    if (!url) {
      localStorage.removeItem(WEBHOOK_STORAGE_KEY);
      return true;
    }

    // Validation basique de l'URL
    if (typeof url !== 'string' || !url.startsWith('https://discord.com/api/webhooks/')) {
      console.error('URL de webhook Discord invalide');
      return false;
    }

    localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du webhook:', error);
    return false;
  }
};

/**
 * Envoie une requête au webhook Discord
 * @param {string} url - URL du webhook
 * @param {Object} data - Données à envoyer
 * @returns {Promise<Object>} Réponse du serveur
 * @private
 */
const sendWebhookRequest = async (url, data) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Gestion du rate limiting
    if (response.status === 429) {
      const retryAfter = (await response.json())?.retry_after || 5;
      console.warn(`Rate limited by Discord. Waiting ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return sendWebhookRequest(url, data);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'envoi au webhook:', error);
    throw error;
  }
};

/**
 * Divise un tableau en plusieurs tableaux plus petits
 * @param {Array} array - Tableau à diviser
 * @param {number} size - Taille maximale de chaque lot
 * @returns {Array<Array>} Tableau de tableaux contenant les lots
 */
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Envoie une notification de tombola au webhook Discord
 * @param {Object} data - Données de la notification
 * @returns {Promise<{success: boolean, error?: string, batches?: number}>}
 */
export const sendTombolaNotification = async (data) => {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn('Aucune URL de webhook configurée');
    return { success: false, error: 'Aucune URL de webhook configurée' };
  }

  try {
    // Créer le message principal
    const mainEmbed = {
      username: 'Tombola Bot',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
      embeds: [{
        title: '🎟️ Nouvel achat de tickets de tombola',
        color: 0x0099ff,
        fields: [
          { name: '👤 Participant', value: `${data.firstName} ${data.lastName}`, inline: true },
          { name: '📞 Téléphone', value: data.phone, inline: true },
          { name: '🎫 Nombre de tickets', value: data.ticketCount.toString(), inline: true },
          { name: '💰 Montant total', value: `${data.totalAmount} €`, inline: true },
          { name: '📅 Date', value: new Date().toLocaleString('fr-FR'), inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    // Envoyer le message principal
    await sendWebhookRequest(webhookUrl, mainEmbed);

    // Envoyer les tickets par lots
    const TICKETS_PER_BATCH = 10; // Réduit pour éviter les erreurs
    const ticketBatches = chunkArray(data.ticketNumbers || [], TICKETS_PER_BATCH);

    for (let i = 0; i < ticketBatches.length; i++) {
      const batch = ticketBatches[i];
      const batchEmbed = {
        username: 'Tombola Bot',
        avatar_url: 'https://i.imgur.com/4M34hi2.png',
        embeds: [{
          color: 0x0099ff,
          title: `🎫 Lot ${i + 1}/${ticketBatches.length}`,
          description: '```' + batch.join('\n') + '```',
          footer: {
            text: `Tickets ${i * TICKETS_PER_BATCH + 1}-${
              Math.min((i + 1) * TICKETS_PER_BATCH, data.ticketCount)
            } sur ${data.ticketCount}`
          },
          timestamp: new Date().toISOString()
        }]
      };

      await sendWebhookRequest(webhookUrl, batchEmbed);

      // Respecter le rate limiting
      if (i < ticketBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    return { success: true, batches: ticketBatches.length };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return { 
      success: false, 
      error: error.message || 'Erreur lors de l\'envoi à Discord',
      batches: 0
    };
  }
};

/**
 * Teste la connexion au webhook Discord
 * @param {string} [customUrl] - URL personnalisée à tester
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export const testWebhook = async (customUrl = null) => {
  const webhookUrl = customUrl || getWebhookUrl();
  
  if (!webhookUrl) {
    const error = 'Aucune URL de webhook fournie';
    console.error(error);
    return { success: false, error };
  }

  // Validation du format de l'URL
  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    const error = 'Format d\'URL de webhook Discord invalide. Doit commencer par https://discord.com/api/webhooks/';
    console.error(error);
    return { success: false, error };
  }

  try {
    console.log('Test de connexion au webhook Discord...');
    
    const testMessage = {
      username: 'Tombola Bot',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
      content: '🔔 Test de connexion au webhook',
      embeds: [{
        title: '✅ Connexion réussie',
        description: 'Le webhook est correctement configuré et fonctionne !',
        color: 0x00ff00,
        timestamp: new Date().toISOString()
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
    }

    const successMsg = 'Connexion au webhook établie avec succès !';
    console.log(successMsg);
    return { success: true, message: successMsg };

  } catch (error) {
    console.error('Erreur lors du test du webhook:', error);
    return { 
      success: false, 
      error: `Impossible de se connecter au webhook: ${error.message || 'Erreur inconnue'}` 
    };
  }
};

/**
 * Réinitialise tous les tickets de tombola
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export const resetAllTickets = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Non autorisé. Veuillez vous reconnecter.');
    }

    const response = await fetch('/api/tombola/reset-tickets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la réinitialisation');
    }

    const message = 'Tous les tickets ont été réinitialisés avec succès.';
    console.log(message);
    return { success: true, message };

  } catch (error) {
    console.error('Erreur lors de la réinitialisation des tickets:', error);
    return { 
      success: false, 
      error: error.message || 'Erreur inconnue lors de la réinitialisation'
    };
  }
};