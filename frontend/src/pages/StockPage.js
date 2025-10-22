import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';
import AuthContext from '../context/AuthContext';

// Imports depuis Material-UI
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Box, Chip, TextField, Button, Alert, AlertTitle,
  Accordion, AccordionSummary, AccordionDetails, IconButton
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';

// Composant pour les matières premières
const IngredientManager = () => {
  const { user } = useContext(AuthContext);
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
      } catch (err) {
        showNotification("Erreur lors de la synchronisation.", "error");
      }
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette matière première ?")) {
      try {
        await api.delete(`/ingredients/${id}`);
        showNotification("Ingrédient supprimé.", "info");
      } catch (err) {
        showNotification("Erreur lors de la suppression.", "error");
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Inventaire des Matières Premières</Typography>
        {user?.role === 'admin' &&
            <Button variant="outlined" size="small" onClick={handleSync}>
                Synchroniser depuis les Recettes
            </Button>
        }
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ingrédient</TableCell>
              <TableCell>Unité</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="center">Statut</TableCell>
              <TableCell align="center">Mettre à jour</TableCell>
              {user?.role === 'admin' && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map(ing => (
              <TableRow key={ing._id}>
                <TableCell>{ing.name}</TableCell>
                <TableCell>{ing.unit}</TableCell>
                <TableCell align="right">{ing.stock}</TableCell>
                <TableCell align="center">{ing.stock <= 500 && (<span title="Stock bas">⚠️</span>)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <TextField size="small" type="number" value={ing.editedStock} onChange={(e) => handleStockChange(ing._id, e.target.value)} sx={{ width: '100px' }}/>
                    <Button variant="contained" size="small" onClick={() => handleSaveStock(ing._id, ing.editedStock)}>OK</Button>
                  </Box>
                </TableCell>
                {user?.role === 'admin' && (
                  <TableCell align="center">
                    <IconButton onClick={() => handleDelete(ing._id)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {user?.role === 'admin' && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary" onClick={async () => {
            const stocks = ingredients
              .filter(i => String(i.stock) !== String(i.editedStock))
              .map(i => ({ _id: i._id, stock: Number(i.editedStock) }));
            if (stocks.length === 0) {
              showNotification("Aucun stock d’ingrédient à mettre à jour", "info");
              return;
            }
            try {
              await api.post('/ingredients/stocks/bulk-update', { stocks });
              showNotification(`${stocks.length} matières premières mises à jour en lot !`, 'success');
              fetchIngredients();
            } catch (err) {
              showNotification('Erreur lors de la mise à jour groupée !', 'error');
            }
          }}>
            Valider tout l’inventaire Matières Premières
          </Button>
        </Box>
      )}
    </Box>
  );
};

function StockPage() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [deliveryStatus, setDeliveryStatus] = useState({ isActive: false, companyName: '', expectedReceipts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const LOW_STOCK_THRESHOLD = 10;

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, statusRes, ingredientsRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings/delivery-status'),
        api.get('/ingredients')
      ]);
      
      const categoryOrder = ["Menus", "Plats", "Boissons", "Desserts"];
      const sortedProducts = productsRes.data.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.category);
        const indexB = categoryOrder.indexOf(b.category);
        return indexA - indexB;
      });
      
      const productsWithEdit = sortedProducts.map(p => ({ ...p, editedStock: p.stock }));
      setProducts(productsWithEdit);
      setIngredients(ingredientsRes.data || []);
      const value = statusRes.data.value || { isActive: false, companyName: '', expectedReceipts: [] };
      setDeliveryStatus({
        isActive: !!value.isActive,
        companyName: value.companyName || '',
        expectedReceipts: Array.isArray(value.expectedReceipts) ? value.expectedReceipts : []
      });

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
    } catch (err) {
      showNotification("Erreur lors de la mise à jour du stock.", 'error');
    }
  };

  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);

  const groupedReceipts = useMemo(() => {
    const groups = {};
    const receipts = (deliveryStatus.expectedReceipts || []);
    for (const rec of receipts) {
      const company = rec.company || '-';
      if (!groups[company]) {
        groups[company] = { company, total: 0, items: [] };
      }
      const ing = ingredients.find(i => i._id === rec.ingredientId);
      groups[company].items.push({
        productName: ing ? ing.name : 'Matière Première',
        quantity: Number(rec.quantity) || 0
      });
      groups[company].total += Number(rec.quantity) || 0;
    }
    const result = Object.values(groups).map(g => ({
      ...g,
      items: g.items.sort((a, b) => a.productName.localeCompare(b.productName))
    })).sort((a, b) => a.company.localeCompare(b.company));
    return result;
  }, [deliveryStatus.expectedReceipts, ingredients]);

  const globalExpectedTotal = useMemo(() => {
    return groupedReceipts.reduce((sum, g) => sum + (g.total || 0), 0);
  }, [groupedReceipts]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" align="center">{error}</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {deliveryStatus.isActive && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Information</AlertTitle>
          Une commande de matière première est en route via l'entreprise : <strong>{deliveryStatus.companyName}</strong>
          {groupedReceipts.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Quantités prévues par entreprise</Typography>
              <Paper elevation={0} sx={{ p: 1, mb: 1, bgcolor: 'action.hover', display: 'inline-block' }}>
                <Typography variant="body2">Total global prévu: <strong>{globalExpectedTotal}</strong></Typography>
              </Paper>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Entreprise</TableCell>
                      <TableCell>Produit</TableCell>
                      <TableCell align="right">Quantité</TableCell>
                      <TableCell align="right">Total Entreprise</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedReceipts.map(group => (
                      group.items.map((item, idx) => (
                        <TableRow key={`${group.company}-${item.productName}-${idx}`}>
                          <TableCell>
                            {group.company}
                            <Chip label={group.total} size="small" color="primary" sx={{ ml: 1 }} />
                          </TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right" style={{ fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                            {idx === 0 ? group.total : ''}
                          </TableCell>
                        </TableRow>
                      ))
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestion des Stocks
        </Typography>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6">
            Valeur Totale Produits : ${totalStockValue.toFixed(2)}
          </Typography>
        </Paper>
      </Box>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Stocks Produits Finis</Typography>
        </AccordionSummary>
        <AccordionDetails>
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
            {user?.role === 'admin' && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" onClick={async () => {
                  const stocks = products
                    .filter(p => String(p.stock) !== String(p.editedStock))
                    .map(p => ({ _id: p._id, stock: Number(p.editedStock) }));
                  if (stocks.length === 0) {
                    showNotification("Aucun stock produit à mettre à jour", "info");
                    return;
                  }
                  try {
                    await api.post('/products/stocks/bulk-update', { stocks });
                    showNotification(`${stocks.length} produits mis à jour en lot !`, 'success');
                    fetchData();
                  } catch (err) {
                    showNotification('Erreur lors de la mise à jour groupée !', 'error');
                  }
                }}>
                  Valider tout l’inventaire Produits Finis
                </Button>
              </Box>
            )}
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Inventaire des Matières Premières</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <IngredientManager />
        </AccordionDetails>
      </Accordion>
      
    </Container>
  );
}

export default StockPage;