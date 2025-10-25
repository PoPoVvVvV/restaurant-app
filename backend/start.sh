#!/bin/bash

# Attendre quelques secondes pour s'assurer que tous les services sont prêts
sleep 2

# Afficher la version de Node
echo "Node version:"
node --version

# Afficher le répertoire courant et son contenu
echo "Current directory:"
pwd
echo "Directory contents:"
ls -la

# Démarrer l'application
echo "Starting application..."
node server.js