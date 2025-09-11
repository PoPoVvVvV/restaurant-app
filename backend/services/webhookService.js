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
      const payload = {
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
}

export default new WebhookService();
