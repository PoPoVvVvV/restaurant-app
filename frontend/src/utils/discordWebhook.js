import api from '../services/api';

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
 * Teste la connexion au webhook Discord en envoyant un message de test
 * @param {string} [customUrl] - URL personnalisée à tester (optionnelle)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const testWebhook = async (customUrl = null) => {
  const webhookUrl = customUrl || getWebhookUrl();
  
  if (!webhookUrl) {
    console.error('Aucune URL de webhook fournie');
    return { success: false, error: 'Aucune URL de webhook fournie' };
  }

  // Vérification basique du format de l'URL
  if (!webhookUrl.includes('discord.com/api/webhooks/')) {
    console.error('Format d\'URL de webhook Discord invalide');
    return { 
      success: false, 
      error: 'L\'URL ne semble pas être un webhook Discord valide' 
    };
  }

  try {
    console.log('Envoi d\'une requête de test au webhook...');
    
    // Créer un message de test simple
    const testMessage = {
      content: '✅ Test de connexion au webhook réussi!',
      embeds: [{
        title: 'Test de webhook',
        description: 'Ceci est un message de test envoyé depuis l\'application de tombola.',
        color: 0x00ff00,
        timestamp: new Date().toISOString()
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });

    console.log('Réponse du serveur:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `Erreur HTTP: ${response.status} - ${response.statusText}`;
      
      // Essayer d'obtenir plus de détails sur l'erreur
      try {
        const errorData = await response.json();
        console.error('Détails de l\'erreur:', errorData);
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        }
      } catch (e) {
        console.error('Impossible de parser la réponse d\'erreur:', e);
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }

    console.log('Test de webhook réussi!');
    return { 
      success: true,
      message: 'Connexion au webhook établie avec succès!'
    };
    
  } catch (error) {
    console.error('Erreur lors du test du webhook:', error);
    let errorMessage = error.message || 'Erreur inconnue';
    
    // Gestion spécifique des erreurs de réseau
    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else if (error.message.includes('invalid json')) {
        errorMessage = 'La réponse du serveur est invalide.';
      }
    }
    
    return { 
      success: false, 
      error: `Échec du test de webhook: ${errorMessage}`
    };
  }
};

/**
 * Réinitialise tous les tickets de tombola
 * @returns {Promise<{success: boolean, message: string}>} Résultat de l'opération
 */
export const resetAllTickets = async () => {
  try {
    console.log('Début de la réinitialisation des tickets...');
    
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    console.log('Token récupéré:', token ? 'présent' : 'absent');
    
    if (!token) {
      return { 
        success: false, 
        message: 'Non autorisé. Veuillez vous reconnecter.' 
      };
    }

    console.log('Envoi de la requête de réinitialisation...');
    
    // Utilisation de l'instance api configurée
    const response = await api.post('/tombola/reset-tickets', {});
    
    console.log('Réponse reçue:', response);

    // Effacer le stockage local si l'API a réussi
    localStorage.removeItem('tombolaTickets');
    console.log('Tickets réinitialisés avec succès');
    
    return { 
      success: true, 
      message: 'Tous les tickets ont été réinitialisés avec succès.' 
    };
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des tickets:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Une erreur est survenue lors de la réinitialisation des tickets.';
    return { 
      success: false, 
      message: errorMessage
    };
  }
};