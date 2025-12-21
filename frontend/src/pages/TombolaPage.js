import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Receipt as ReceiptIcon, 
  AdminPanelSettings as AdminIcon,
  Link as LinkIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';
import { useContext } from 'react';
import TombolaDraw from '../components/TombolaDraw';
import { getWebhookUrl, setWebhookUrl, sendTombolaNotification, testWebhook } from '../utils/discordWebhook';

// Fonction pour générer un code aléatoire de 12 caractères (lettres majuscules et chiffres)
const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const usedCodes = new Set(JSON.parse(localStorage.getItem('tombolaTickets') || '[]').map(t => t.code));
  
  do {
    result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (usedCodes.has(result));
  
  return result;
};

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const TombolaPage = () => {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    ticketCount: 1,
  });
  
  const [tickets, setTickets] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [tabValue, setTabValue] = useState(0);
  
  // État pour la configuration du webhook
  const [webhookConfig, setWebhookConfig] = useState({
    url: '',
    isTesting: false,
    testResult: null,
    showConfig: false
  });
  
  // Charger la configuration du webhook au montage du composant
  useEffect(() => {
    const savedWebhookUrl = getWebhookUrl();
    if (savedWebhookUrl) {
      setWebhookConfig(prev => ({
        ...prev,
        url: savedWebhookUrl,
        showConfig: isAdmin // Afficher la config si admin
      }));
    }
  }, [isAdmin]);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  // Charger les tickets existants depuis le localStorage
  useEffect(() => {
    const savedTickets = JSON.parse(localStorage.getItem('tombolaTickets') || '[]');
    setTickets(savedTickets);
    
    // Précharger le composant de tirage pour les admins
    if (isAdmin) {
      import('../components/TombolaDraw');
    }
  }, [isAdmin]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleTicketsUpdate = (updatedTickets) => {
    setTickets(updatedTickets);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ticketCount' ? Math.max(1, parseInt(value) || 1) : value
    }));
  };

  const generateTickets = useCallback(() => {
    if (!formData.lastName || !formData.firstName || !formData.phone) {
      showSnackbar('Veuillez remplir tous les champs', 'error');
      return [];
    }

    const newTickets = [];
    for (let i = 0; i < formData.ticketCount; i++) {
      newTickets.push({
        id: Date.now() + i,
        code: generateRandomCode(),
        lastName: formData.lastName,
        firstName: formData.firstName,
        phone: formData.phone,
        date: new Date().toISOString(),
        price: 250 // Prix par ticket
      });
    }
    return newTickets;
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newTickets = generateTickets();
    if (newTickets.length === 0) return;
    
    const updatedTickets = [...tickets, ...newTickets];
    setTickets(updatedTickets);
    localStorage.setItem('tombolaTickets', JSON.stringify(updatedTickets));

    // Envoyer une notification Discord si un webhook est configuré
    const webhookUrl = getWebhookUrl();
    if (webhookUrl) {
      try {
        const ticketData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          ticketCount: newTickets.length,
          ticketNumbers: newTickets.map(t => t.code),
          totalAmount: newTickets.length * 250
        };
        
        await sendTombolaNotification(ticketData);
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification Discord:', error);
        // Ne pas bloquer l'utilisateur en cas d'échec d'envoi de la notification
      }
    }
    
    showSnackbar(`${newTickets.length} ticket(s) généré(s) avec succès !`, 'success');
    
    // Réinitialiser le formulaire
    setFormData({
      lastName: formData.lastName,
      firstName: formData.firstName,
      phone: formData.phone,
      ticketCount: 1,
    });
  };

  // Fonctions pour la gestion du webhook
  const handleWebhookUrlChange = (e) => {
    setWebhookConfig(prev => ({
      ...prev,
      url: e.target.value,
      testResult: null // Réinitialiser le résultat du test si l'URL change
    }));
  };

  const handleSaveWebhook = () => {
    setWebhookUrl(webhookConfig.url);
    showSnackbar('URL du webhook enregistrée avec succès !', 'success');
  };

  const handleTestWebhook = async () => {
    if (!webhookConfig.url) {
      showSnackbar('Veuillez d\'abord entrer une URL de webhook', 'error');
      return;
    }

    setWebhookConfig(prev => ({ ...prev, isTesting: true, testResult: null }));

    try {
      const result = await testWebhook(webhookConfig.url);
      
      setWebhookConfig(prev => ({
        ...prev,
        isTesting: false,
        testResult: result.success ? 'success' : 'error'
      }));
      
      if (result.success) {
        showSnackbar('Test de connexion réussi ! Le webhook est correctement configuré.', 'success');
      } else {
        showSnackbar(`Erreur lors du test du webhook: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Erreur lors du test du webhook:', error);
      setWebhookConfig(prev => ({
        ...prev,
        isTesting: false,
        testResult: 'error'
      }));
      showSnackbar('Erreur lors du test du webhook. Vérifiez la console pour plus de détails.', 'error');
    }
  };

  const toggleWebhookConfig = () => {
    setWebhookConfig(prev => ({
      ...prev,
      showConfig: !prev.showConfig
    }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const calculateTotal = () => {
    return tickets.reduce((sum, ticket) => sum + ticket.price, 0);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tombola
        </Typography>
        
        {isAdmin && (
          <Button 
            variant="outlined" 
            startIcon={<LinkIcon />}
            onClick={toggleWebhookConfig}
            color={webhookConfig.showConfig ? 'secondary' : 'primary'}
          >
            {webhookConfig.showConfig ? 'Masquer la configuration' : 'Configurer le webhook'}
          </Button>
        )}
      </Box>

      {/* Section de configuration du webhook (visible uniquement pour les admins) */}
      {/* Section de configuration du webhook (visible uniquement pour les admins) */}
      {isAdmin && webhookConfig.showConfig && (
        <Paper elevation={3} sx={{ p: 3, mb: 4, backgroundColor: '#f9f9f9' }}>
          <Typography variant="h6" gutterBottom>
            <LinkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Configuration du Webhook Discord
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Configurez l'URL du webhook Discord pour recevoir des notifications à chaque achat de ticket.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="URL du webhook Discord"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhookConfig.url}
              onChange={handleWebhookUrlChange}
              disabled={webhookConfig.isTesting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveWebhook}
              disabled={webhookConfig.isTesting || !webhookConfig.url}
              startIcon={<SaveIcon />}
            >
              Enregistrer
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleTestWebhook}
              disabled={webhookConfig.isTesting || !webhookConfig.url}
              startIcon={
                webhookConfig.testResult === 'success' ? (
                  <CheckIcon color="success" />
                ) : webhookConfig.testResult === 'error' ? (
                  <CloseIcon color="error" />
                ) : (
                  <LinkIcon />
                )
              }
            >
              {webhookConfig.isTesting ? 'Test en cours...' : 'Tester'}
            </Button>
          </Box>
          
          {webhookConfig.url && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Une notification sera envoyée à chaque achat de ticket avec les détails du participant.
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 3 }}
      >
        <Tab label="Acheter des tickets" />
        {isAdmin && <Tab label="Tirage au sort" icon={<AdminIcon />} />}
      </Tabs>
      
      <TabPanel value={tabValue} index={0}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Acheter des tickets
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="Prénom"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="Téléphone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="Nombre de tickets"
              name="ticketCount"
              type="number"
              value={formData.ticketCount}
              onChange={handleChange}
              inputProps={{ min: 1 }}
              required
              fullWidth
              variant="outlined"
              size="small"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<ReceiptIcon />}
                size="large"
              >
                Générer les tickets ({formData.ticketCount * 250} $)
              </Button>
            </Box>
          </Box>
        </Paper>
      </TabPanel>

      {isAdmin && (
        <TabPanel value={tabValue} index={1}>
          <TombolaDraw tickets={tickets.filter(t => !t.isWinner)} onDrawComplete={handleTicketsUpdate} />
        </TabPanel>
      )}
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Récapitulatif</Typography>
            <Typography variant="h6">
              Total: <strong>{calculateTotal()} $</strong> ({tickets.length} tickets)
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
          {tickets.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Prénom</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell align="right">Prix</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Box component="code" sx={{ fontFamily: 'monospace' }}>
                          {ticket.code}
                        </Box>
                      </TableCell>
                      <TableCell>{ticket.lastName}</TableCell>
                      <TableCell>{ticket.firstName}</TableCell>
                      <TableCell>{ticket.phone}</TableCell>
                      <TableCell align="right">{ticket.price} $</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Aucun ticket généré pour le moment
            </Typography>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TombolaPage;
