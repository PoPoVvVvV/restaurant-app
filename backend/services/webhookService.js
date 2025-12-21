import axios from 'axios';
import Setting from '../models/Setting.js';

class WebhookService {
  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL || null;
    this.enabled = process.env.WEBHOOK_ENABLED === 'true' || false;
  }

  /**
   * Récupère la configuration webhook depuis la base de données
   */
  async getWebhookConfig() {
    try {
      const [enabledSetting, urlSetting] = await Promise.all([
        Setting.findOne({ key: 'webhookEnabled' }),
        Setting.findOne({ key: 'webhookUrl' })
      ]);

      return {
        enabled: enabledSetting?.value || false,
        url: urlSetting?.value || process.env.WEBHOOK_URL || null
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration webhook:', error);
      return {
        enabled: this.enabled,
        url: this.webhookUrl
      };
    }
  }

  /**
   * Envoie une notification webhook pour une modification de stock
   * @param {Object} data - Données de la modification
   * @param {string} data.type - Type de modification ('product' ou 'ingredient')
   * @param {string} data.action - Action effectuée ('stock_updated')
   * @param {string} data.itemName - Nom de l'item modifié
   * @param {number} data.oldStock - Ancien stock
   * @param {number} data.newStock - Nouveau stock
   * @param {string} data.user - Utilisateur qui a effectué la modification
   * @param {Date} data.timestamp - Timestamp de la modification
   */
  async sendStockUpdateNotification(data) {
    const config = await this.getWebhookConfig();
    
    console.log('Tentative d\'envoi webhook:', { config, data });
    
    if (!config.enabled || !config.url) {
      console.log('Webhook désactivé ou URL non configurée:', { enabled: config.enabled, url: config.url });
      return;
    }

    try {
      // Détecter si c'est un webhook Discord
      const isDiscordWebhook = config.url.includes('discord.com/api/webhooks');
      
      let payload;
      if (isDiscordWebhook) {
        // Format spécifique pour Discord
        const difference = data.newStock - data.oldStock;
        const differenceText = difference > 0 ? `+${difference}` : difference.toString();
        const color = difference > 0 ? 0x00ff00 : difference < 0 ? 0xff0000 : 0xffff00;
        
        payload = {
          embeds: [{
            title: `📦 Modification de Stock - ${data.itemName}`,
            color: color,
            fields: [
              {
                name: "Type d'item",
                value: data.type === 'product' ? '🛍️ Produit' : '🥘 Ingrédient',
                inline: true
              },
              {
                name: "Stock précédent",
                value: data.oldStock.toString(),
                inline: true
              },
              {
                name: "Nouveau stock",
                value: data.newStock.toString(),
                inline: true
              },
              {
                name: "Différence",
                value: differenceText,
                inline: true
              },
              {
                name: "Modifié par",
                value: data.user,
                inline: true
              },
              {
                name: "Heure",
                value: new Date(data.timestamp || new Date()).toLocaleString('fr-FR'),
                inline: true
              }
            ],
            footer: {
              text: "Restaurant App - Gestion des Stocks"
            },
            timestamp: data.timestamp || new Date().toISOString()
          }]
        };
      } else {
        // Format générique pour autres webhooks
        payload = {
          type: 'stock_update',
          action: data.action,
          item: {
            type: data.type,
            name: data.itemName,
            oldStock: data.oldStock,
            newStock: data.newStock,
            difference: data.newStock - data.oldStock
          },
          user: data.user,
          timestamp: data.timestamp || new Date().toISOString(),
          message: `Stock de ${data.itemName} modifié de ${data.oldStock} à ${data.newStock} par ${data.user}`
        };
      }

      const response = await axios.post(config.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Restaurant-App-Webhook/1.0'
        },
        timeout: 5000 // 5 secondes de timeout
      });

      console.log('Webhook envoyé avec succès:', response.status);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du webhook:', error.message);
      if (error.response) {
        console.error('Réponse d\'erreur:', error.response.status, error.response.data);
      }
      // Ne pas faire échouer la requête principale si le webhook échoue
    }
  }

  /**
   * Envoie une notification pour une modification de stock de produit
   */
  async notifyProductStockUpdate(product, oldStock, newStock, user) {
    await this.sendStockUpdateNotification({
      type: 'product',
      action: 'stock_updated',
      itemName: product.name,
      oldStock,
      newStock,
      user: user.username || user.email || 'Utilisateur inconnu',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envoie une notification pour une modification de stock d'ingrédient
   */
  async notifyIngredientStockUpdate(ingredient, oldStock, newStock, user) {
    await this.sendStockUpdateNotification({
      type: 'ingredient',
      action: 'stock_updated',
      itemName: ingredient.name,
      oldStock,
      newStock,
      user: user.username || user.email || 'Utilisateur inconnu',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envoie une notification webhook pour la découverte d'un easter-egg
   * @param {Object} data - Données de l'easter-egg
   * @param {string} data.user - Utilisateur qui a découvert l'easter-egg
   * @param {string} data.easterEggType - Type d'easter-egg découvert
   * @param {string} data.sequence - Séquence de clics utilisée
   * @param {Date} data.timestamp - Timestamp de la découverte
   */
  async sendEasterEggNotification(data) {
    const config = await this.getWebhookConfig();
    
    console.log('Tentative d\'envoi webhook easter-egg:', { config, data });
    
    if (!config.enabled || !config.url) {
      console.log('Webhook désactivé ou URL non configurée:', { enabled: config.enabled, url: config.url });
      return;
    }

    try {
      // Détecter si c'est un webhook Discord
      const isDiscordWebhook = config.url.includes('discord.com/api/webhooks');
      
      let payload;
      if (isDiscordWebhook) {
        // Format spécifique pour Discord
        payload = {
          embeds: [{
            title: `🎉 Easter-Egg Découvert !`,
            description: `**${data.user}** a découvert un easter-egg secret !`,
            color: 0x00ff00, // Vert pour la réussite
            fields: [
              {
                name: "👤 Découvreur",
                value: data.user,
                inline: true
              },
              {
                name: "⏰ Découvert le",
                value: new Date(data.timestamp || new Date()).toLocaleString('fr-FR'),
                inline: true
              }
            ],
            footer: {
              text: "Restaurant App - Easter-Egg System"
            },
            timestamp: data.timestamp || new Date().toISOString(),
            thumbnail: {
              url: "https://cdn.discordapp.com/emojis/🐍.png"
            }
          }]
        };
      } else {
        // Format générique pour autres webhooks
        payload = {
          type: 'easter_egg_discovered',
          action: 'easter_egg_unlocked',
          user: data.user,
          timestamp: data.timestamp || new Date().toISOString(),
          message: `${data.user} a découvert un easter-egg secret !`
        };
      }

      const response = await axios.post(config.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Restaurant-App-Webhook/1.0'
        },
        timeout: 5000 // 5 secondes de timeout
      });

      console.log('Webhook easter-egg envoyé avec succès:', response.status);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du webhook easter-egg:', error.message);
      if (error.response) {
        console.error('Réponse d\'erreur:', error.response.status, error.response.data);
      }
      // Ne pas faire échouer la requête principale si le webhook échoue
    }
  }

  /**
   * Envoie une notification pour la découverte d'un easter-egg
   */
  async notifyEasterEggDiscovery(user, easterEggType = 'Snake Game', sequence = 'Logo → Ventes → Ma Compta → Recettes → Stocks → Ma Compta') {
    await this.sendEasterEggNotification({
      user: user.username || user.email || 'Utilisateur inconnu',
      easterEggType,
      sequence,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envoie une notification de tombola au webhook Discord
   * @param {Object} data - Données de la tombola
   * @param {string} data.firstName - Prénom du participant
   * @param {string} data.lastName - Nom du participant
   * @param {string} data.phone - Téléphone du participant
   * @param {number} data.ticketCount - Nombre de tickets achetés
   * @param {string[]} data.ticketNumbers - Numéros de tickets
   * @param {number} data.totalAmount - Montant total
   * @returns {Promise<{success: boolean, error?: string}>} Résultat de l'opération
   */
  async sendTombolaNotification(data) {
    const config = await this.getWebhookConfig();
    
    if (!config.enabled || !config.url) {
      console.log('Webhook désactivé ou URL non configurée');
      return { success: false, error: 'Webhook non configuré' };
    }

    try {
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
            name: '💰 Montant total',
            value: `${data.totalAmount} $`,
            inline: true
          },
          {
            name: '📅 Date',
            value: new Date().toLocaleString('fr-FR'),
            inline: true
          },
          {
            name: '📋 Détail des tickets',
            value: '```' + data.ticketNumbers.join('\n') + '```',
            inline: false
          }
        ],
        timestamp: new Date().toISOString()
      };

      // Envoyer la notification
      await axios.post(config.url, {
        username: 'Tombola Bot',
        avatar_url: 'https://i.imgur.com/4M34hi2.png',
        embeds: [mainEmbed]
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de tombola:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Erreur inconnue' 
      };
    }
  }
}

export default new WebhookService();
