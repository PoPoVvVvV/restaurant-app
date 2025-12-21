// Stockage de l'URL du webhook dans localStorage
const WEBHOOK_STORAGE_KEY = 'tombola_discord_webhook';

/**
 * Récupère l'URL du webhook depuis le stockage local
 * @returns {string} L'URL du webhook ou une chaîne vide si non défini
 */
export const getWebhookUrl = () => {
  return localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
};

/**
 * Définit l'URL du webhook dans le stockage local
 * @param {string} url - L'URL du webhook à enregistrer
 * @returns {boolean} true si l'opération a réussi
 */
export const setWebhookUrl = (url) => {
  try {
    localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du webhook:', error);
    return false;
  }
};

/**
 * Envoie une notification de tombola au webhook Discord
 * @param {Object} data - Les données à envoyer
 * @param {string} data.firstName - Prénom du participant
 * @param {string} data.lastName - Nom du participant
 * @param {string} data.phone - Téléphone du participant
 * @param {number} data.ticketCount - Nombre de tickets achetés
 * @param {string[]} data.ticketNumbers - Liste des numéros de tickets
 * @param {number} data.totalAmount - Montant total de l'achat
 * @returns {Promise<Object>} Réponse du serveur Discord
 */
export const sendTombolaNotification = async (data) => {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn('Aucune URL de webhook configurée');
    return { success: false, error: 'Aucune URL de webhook configurée' };
  }

  const embed = {
    title: '🎟️ Nouvel achat de tickets de tombola',
    color: 0x0099ff,
    fields: [
      {
        name: '👤 Participant',
        value: `${data.firstName} ${data.lastName}`,
        inline: true
      },
      {
        name: '📞 Téléphone',
        value: data.phone,
        inline: true
      },
      {
        name: '🎫 Nombre de tickets',
        value: data.ticketCount.toString(),
        inline: true
      },
      {
        name: '🔢 Numéros de tickets',
        value: data.ticketNumbers.join('\n') || 'Aucun numéro',
        inline: false
      },
      {
        name: '💰 Montant total',
        value: `${data.totalAmount} $`,
        inline: true
      },
      {
        name: '📅 Date',
        value: new Date().toLocaleString('fr-FR'),
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Tombola Bot',
        avatar_url: 'https://i.imgur.com/4M34hi2.png',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification Discord:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Teste la connexion au webhook Discord
 * @param {string} [customUrl] - URL personnalisée à tester (optionnelle)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const testWebhook = async (customUrl = null) => {
  const webhookUrl = customUrl || getWebhookUrl();
  
  if (!webhookUrl) {
    return { success: false, error: 'Aucune URL de webhook fournie' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'HEAD'
    });

    if (!response.ok) {
      return { 
        success: false, 
        error: `Erreur HTTP: ${response.status} - ${response.statusText}`
      };
    }

    // Vérifier si l'URL semble être un webhook Discord
    if (!webhookUrl.includes('discord.com/api/webhooks/')) {
      return { 
        success: false, 
        error: 'L\'URL ne semble pas être un webhook Discord valide' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur lors du test du webhook:', error);
    return { 
      success: false, 
      error: error.message || 'Erreur inconnue lors du test du webhook' 
    };
  }
};