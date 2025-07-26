import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Box, Chip, TextField, Button, Alert, AlertTitle
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Composant pour les matières premières
const IngredientManager = () => {
  const [ingredients, setIngredients] = useState([]);
  const { showNotification } = useNotification();
  
  const fetchIngredients = useCallback(async () => {
    try {
        const { data } = await api.get('/ingredients');
        setIngredients(data.map(ing => ({ ...ing, editedStock: ing.stock })));
    } catch (err) {
        showNotification("Impossible de charger les matières premières.", "error");
    }
  }, []);
  
  useEffect(() => { 
      fetchIngredients();

      const handleDataUpdate = (data) => {
        if (data.type === 'INGREDIENTS_UPDATED') {
            fetchIngredients();
        }
      };
      socket.on('data-updated', handleDataUpdate);
      return () => { socket.off('data-updated', handleDataUpdate); };
  }, [fetchIngredients]);

  const handleStockChange = (id, value) => {
    setIngredients(prev => prev.map(i => i._id === id ? { ...i, editedStock: value } : i));
  };

  const handleSaveStock = async (id, newStock) => {
    try {
        await api.put(`/ingredients/${id}/stock`, { stock: newStock });
        fetchIngredients();
        showNotification("Stock de l'ingrédient mis à jour.", "success");
    } catch (err) {
        showNotification("Erreur lors de la mise à jour.", "error");
    }
  };

  const handleSync = async () => {
    if (window.confirm("Voulez-vous vraiment ajouter tous les ingrédients des recettes à cet inventaire ? Les ingrédients existants ne seront pas modifiés.")) {
      try {
        const { data } = await api.post('/ingredients/sync-from-recipes');
        showNotification(data.message, 'success');
        // Le refetch sera géré par l'événement socket
      } catch (err) {
        showNotification("Erreur lors de la synchronisation.", "error");
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Inventaire des Matières Premières</Typography>
        <Button variant="outlined" onClick={handleSync}>
          Synchroniser depuis les Recettes
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell>Ingrédient</TableCell><TableCell>Unité</TableCell><TableCell align="right">Stock</TableCell><TableCell align="center">Mettre à jour</TableCell></TableRow></TableHead>
          <TableBody>
            {ingredients.map(ing => (
              <TableRow key={ing._id}>
                <TableCell>{ing.name}</TableCell>
                <TableCell>{ing.unit}</TableCell>
                <TableCell align="right">{ing.stock}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <TextField size="small" type="number" value={ing.editedStock} onChange={(e) => handleStockChange(ing._id, e.target.value)} sx={{ width: '100px' }}/>
                    <Button variant="contained" onClick={() => handleSaveStock(ing._id, ing.editedStock)}>OK</Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

function StockPage() {
  const [products, setProducts] = useState([]);
  const [deliveryStatus, setDeliveryStatus] = useState({ isActive: false, companyName: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const LOW_STOCK_THRESHOLD = 10;

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, statusRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings/delivery-status')
      ]);
      
      const categoryOrder = ["Menus", "Plats", "Boissons", "Desserts"];
      const sortedProducts = productsRes.data.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.category);
        const indexB = categoryOrder.indexOf(b.category);
        return indexA - indexB;
      });
      
      const productsWithEdit = sortedProducts.map(p => ({ ...p, editedStock: p.stock }));
      setProducts(productsWithEdit);
      setDeliveryStatus(statusRes.data.value);

    } catch (err) {
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleDataUpdate = (data) => {
      if (data.type === 'PRODUCTS_UPDATED' || data.type === 'TRANSACTIONS_UPDATED' || data.type === 'SETTINGS_UPDATED') {
        fetchData();
      }
    };
    socket.on('data-updated', handleDataUpdate);
    return () => {
      socket.off('data-updated', handleDataUpdate);
    };
  }, [fetchData]);

  const handleStockChange = (productId, value) => {
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p._id === productId ? { ...p, editedStock: value } : p
      )
    );
  };

  const handleSaveStock = async (productId) => {
    const product = products.find(p => p._id === productId);
    const newStock = product.editedStock;
    if (isNaN(parseInt(newStock, 10)) || parseInt(newStock, 10) < 0) {
        showNotification("Veuillez entrer une valeur de stock valide.", "error");
        return;
    }
    try {
      await api.put(`/products/restock/${productId}`, { newStock });
      showNotification(`${product.name} mis à jour !`, 'success');
      // No need to manually update state, socket event will trigger refetch
    } catch (err) {
      showNotification("Erreur lors de la mise à jour du stock.", 'error');
    }
  };

  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" align="center">{error}</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {deliveryStatus.isActive && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Information</AlertTitle>
          Une commande de matière première est en route via l'entreprise : <strong>{deliveryStatus.companyName}</strong>
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestion des Stocks Produits Finis
        </Typography>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6">
            Valeur Totale : ${totalStockValue.toFixed(2)}
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Produit</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Catégorie</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Statut</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Stock Actuel</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Modifier le Stock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id} hover>
                <TableCell component="th" scope="row">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell align="center">
                  {product.stock <= LOW_STOCK_THRESHOLD ? (<Chip label="Stock bas" color="error" size="small"/>) : (<Chip label="OK" color="success" size="small" />)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '1rem' }}>{product.stock}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <TextField
                      type="number" size="small" value={product.editedStock}
                      onChange={(e) => handleStockChange(product._id, e.target.value)}
                      sx={{ width: '100px' }} inputProps={{ min: 0 }}
                    />
                    <Button variant="contained" size="small" onClick={() => handleSaveStock(product._id)} startIcon={<CheckCircleIcon />}>
                      Valider
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <IngredientManager />
    </Container>
  );
}

export default StockPage;