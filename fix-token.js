const fs = require('fs');
const path = 'c:/Users/Nicol/Documents/GitHub/restaurant-app/frontend/src/utils/discordWebhook.js';

// Lire le contenu du fichier
fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('Erreur lors de la lecture du fichier:', err);
    return;
  }
  
  // Remplacer la clé du token
  const result = data.replace(
    /localStorage\.getItem\('authToken'\)/g, 
    "localStorage.getItem('token')"
  );
  
  // Écrire les modifications dans le fichier
  fs.writeFile(path, result, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
    } else {
      console.log('Le fichier a été mis à jour avec succès !');
      
      // Afficher les 10 lignes modifiées
      const modifiedLines = result.split('\n')
        .filter(line => line.includes('localStorage.getItem'));
      console.log('\nLignes modifiées :');
      console.log(modifiedLines.join('\n'));
    }
  });
});
