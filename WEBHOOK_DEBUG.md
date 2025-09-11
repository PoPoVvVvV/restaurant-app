# Guide de débogage Webhook

## Problème : Le test de connexion webhook ne fonctionne pas

### Étapes de débogage :

1. **Vérifier la configuration dans la base de données :**
   ```javascript
   // Dans la console MongoDB ou via l'API
   db.settings.find({ key: { $in: ["webhookEnabled", "webhookUrl"] } })
   ```

2. **Vérifier les logs du serveur :**
   - Ouvrez la console du serveur backend
   - Regardez les messages de débogage lors du test
   - Recherchez les messages commençant par "Configuration webhook pour test:" et "Tentative d'envoi webhook:"

3. **Tester manuellement l'API :**
   ```bash
   # Remplacer YOUR_TOKEN par votre token d'admin
   curl -X POST http://localhost:5000/api/settings/webhook-test \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

4. **Vérifier l'URL du webhook :**
   - L'URL doit être valide (commencer par http:// ou https://)
   - L'URL doit être accessible depuis votre serveur
   - Pour tester avec un webhook de test, vous pouvez utiliser : https://webhook.site/

5. **Tester avec un webhook de test :**
   - Allez sur https://webhook.site/
   - Copiez l'URL générée
   - Utilisez cette URL dans la configuration webhook
   - Testez la connexion

### Messages d'erreur courants :

- **"Webhook désactivé"** : Activez le webhook dans l'interface admin
- **"URL webhook non configurée"** : Entrez une URL valide
- **"Erreur lors de l'envoi du test webhook"** : Vérifiez l'URL et la connectivité

### Test manuel du service :

```bash
cd backend
node test-webhook.js
```

### Configuration recommandée pour les tests :

1. **Slack :** `https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK`
2. **Discord :** `https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK`
3. **Webhook.site :** `https://webhook.site/unique-id`
4. **ngrok (pour tests locaux) :** `https://your-ngrok-url.ngrok.io/webhook`
