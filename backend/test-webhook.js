// Script de test pour vérifier le webhook
import mongoose from 'mongoose';
import webhookService from './services/webhookService.js';

async function testWebhook() {
  console.log('Test du service webhook...');
  
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant-app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');
    
    // Test de la configuration
    const config = await webhookService.getWebhookConfig();
    console.log('Configuration webhook:', config);
    
    if (!config.enabled) {
      console.log('❌ Webhook désactivé');
      return;
    }
    
    if (!config.url) {
      console.log('❌ URL webhook non configurée');
      return;
    }
    
    console.log('✅ Configuration valide');
    console.log('URL:', config.url);
    
    // Test d'envoi
    await webhookService.sendStockUpdateNotification({
      type: 'test',
      action: 'test_notification',
      itemName: 'Test de notification',
      oldStock: 0,
      newStock: 1,
      user: 'Test Script',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Test webhook envoyé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

testWebhook();
