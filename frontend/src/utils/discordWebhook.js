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
 * Divise un tableau en plusieurs tableaux plus petits
 * @param {Array} array - Le tableau à diviser
 * @param {number} size - Taille maximale de chaque lot
 * @returns {Array[]} Tableau de tableaux contenant les lots
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
 * @param {Object} data - Les données à envoyer
 * @param {string} data.firstName - Prénom du participant
 * @param {string} data.lastName - Nom du participant
 * @param {string} data.phone - Téléphone du participant
 * @param {number} data.ticketCount - Nombre de tickets achetés
 * @param {string[]} data.ticketNumbers - Liste des numéros de tickets
 * @param {number} data.totalAmount - Montant total de l'achat
 * @returns {Promise<{success: boolean, error?: string, batches?: number}>} Résultat de l'opération
 */
export const sendTombolaNotification = async (data) => {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn('Aucune URL de webhook configurée');
    return { success: false, error: 'Aucune URL de webhook configurée' };
  }

  // Limite de caractères pour un champ Discord (1024)
  // On divise les tickets en lots de 20 pour éviter de dépasser la limite
  const TICKETS_PER_BATCH = 20;
  const ticketBatches = chunkArray(data.ticketNumbers, TICKETS_PER_BATCH);
  
  // Créer le message principal
  const mainEmbed = {
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
        name: '� Montant total',
        value: `${data.totalAmount} $`,
        inline: true
      },
      {
        name: '📅 Date',
        value: new Date().toLocaleString('fr-FR'),
        inline: true
      },
      {
        name: '� Détail des tickets',
        value: `Les ${data.ticketCount} tickets sont listés dans les messages suivants.`,
        inline: false
      }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    // Envoyer d'abord le message principal
    let response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Tombola Bot',
        avatar_url: 'https://i.imgur.com/4M34hi2.png',
        embeds: [mainEmbed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
    }

    // Envoyer les lots de tickets
    for (let i = 0; i < ticketBatches.length; i++) {
      const batch = ticketBatches[i];
      const batchEmbed = {
        color: 0x0099ff,
        title: `🎫 Lot ${i + 1}/${ticketBatches.length}`,
        description: '```' + batch.join('\n') + '```',
        footer: {
          text: `Tickets ${i * TICKETS_PER_BATCH + 1}-${Math.min((i + 1) * TICKETS_PER_BATCH, data.ticketCount)} sur ${data.ticketCount}`
        },
        timestamp: new Date().toISOString()
      };

      // Petit délai entre les envois pour éviter le rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Tombola Bot',
          avatar_url: 'https://i.imgur.com/4M34hi2.png',
          embeds: [batchEmbed],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur lors de l'envoi du lot ${i + 1}: ${response.status} - ${errorText}`);
      }
    }

    return { 
      success: true, 
      batches: ticketBatches.length 
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification Discord:', error);
    return { 
      success: false, 
      error: error.message,
      batches: ticketBatches.length
    };
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

/**
 * Réinitialise tous les tickets de tombola
 * @returns {Promise<{success: boolean, message: string}>} Résultat de l'opération
 */
export const resetAllTickets = async () => {
  try {
    // Vérifier si l'utilisateur est admin (vérification côté serveur)
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { 
        success: false, 
        message: 'Non autorisé. Veuillez vous reconnecter.' 
      };
    }

    // Appel API pour réinitialiser les tickets
    const response = await fetch('/api/tombola/reset-tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la réinitialisation des tickets');
    }

    // Effacer le stockage local si l'API a réussi
    localStorage.removeItem('tombolaTickets');
    
    return { 
      success: true, 
      message: 'Tous les tickets ont été réinitialisés avec succès.' 
    };
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des tickets:', error);
    return { 
      success: false, 
      message: error.message || 'Une erreur est survenue lors de la réinitialisation des tickets.'
    };
  }
};