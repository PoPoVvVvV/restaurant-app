import React, { useState, useEffect, useCallback, useContext, useMemo, useRef, memo } from 'react';
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';

// Composant mémorisé pour une ligne d'ingrédient
const IngredientRow = memo(({ ingredient, onStockChange, onSaveStock, onDelete, isAdmin }) => {
  const [localStock, setLocalStock] = useState(ingredient.editedStock);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalStock(ingredient.editedStock);
  }, [ingredient.editedStock]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleChange = (value) => {
    setLocalStock(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      onStockChange(ingredient._id, value);
    }, 150);
  };

  const handleSave = async () => {
    const stockValue = parseFloat(localStock);
    if (isNaN(stockValue) || stockValue < 0) {
      return;
    }
    
    // Ne sauvegarder que si la valeur a changé
    if (stockValue === ingredient.stock) {
      return;
    }

    setIsSaving(true);
    try {
      await onSaveStock(ingredient._id, localStock);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Cela déclenchera handleBlur
    }
  };

  return (
    <TableRow key={ingredient._id}>
      <TableCell>{ingredient.name}</TableCell>
      <TableCell>{ingredient.unit}</TableCell>
      <TableCell align="right">{ingredient.stock}</TableCell>
      <TableCell align="center">{ingredient.stock <= 500 && (<span title="Stock bas">⚠️</span>)}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'center' }}>
          <TextField 
            size="small" 
            type="number" 
            value={localStock} 
            onChange={(e) => handleChange(e.target.value)} 
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            sx={{ width: '100px' }}
          />
          {isSaving && <CircularProgress size={20} />}
        </Box>
      </TableCell>
      {isAdmin && (
        <TableCell align="center">
          <IconButton onClick={() => onDelete(ingredient._id)} color="error" size="small">
            <DeleteIcon />
          </IconButton>
        </TableCell>
      )}
    </TableRow>
  );
});

IngredientRow.displayName = 'IngredientRow';

// Composant pour les matières premières
const IngredientManager = () => {
  const { user } = useContext(AuthContext);
  const [ingredients, setIngredients] = useState([]);
  const { showNotification } = useNotification();
  const fetchIngredientsRef = useRef(null);
  
  const fetchIngredients = useCallback(async () => {
    try {
        const { data } = await api.get('/ingredients');
        setIngredients(data.map(ing => ({ ...ing, editedStock: ing.stock })));
    } catch (err) {
        showNotification("Impossible de charger les matières premières.", "error");
    }
  }, [showNotification]);
  
  fetchIngredientsRef.current = fetchIngredients;
  
  useEffect(() => { 
      fetchIngredients();

      const handleDataUpdate = (data) => {
        if (data.type === 'INGREDIENTS_UPDATED') {
            fetchIngredientsRef.current();
        }
      };
      socket.on('data-updated', handleDataUpdate);
      return () => { socket.off('data-updated', handleDataUpdate); };
  }, []);

  const handleStockChange = useCallback((id, value) => {
    setIngredients(prev => prev.map(i => i._id === id ? { ...i, editedStock: value } : i));
  }, []);

  const handleSaveStock = useCallback(async (id, newStock) => {
    const stockValue = parseFloat(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
        showNotification("Veuillez entrer une valeur de stock valide.", "error");
        return;
    }
    try {
        const { data } = await api.put(`/ingredients/${id}/stock`, { stock: stockValue });
        // Mise à jour locale au lieu de refetch complet
        setIngredients(prev => prev.map(i => 
          i._id === id ? { ...i, stock: data.stock, editedStock: data.stock } : i
        ));
        // Pas de notification de succès pour éviter les notifications excessives lors de modifications multiples
    } catch (err) {
        showNotification(err.response?.data?.message || "Erreur lors de la mise à jour du stock.", "error");
        // En cas d'erreur, restaurer la valeur précédente
        setIngredients(prev => {
          const ingredient = prev.find(i => i._id === id);
          if (!ingredient) return prev;
          return prev.map(i => 
            i._id === id ? { ...i, editedStock: i.stock } : i
          );
        });
    }
  }, [showNotification]);

  const handleSync = useCallback(async () => {
    if (window.confirm("Voulez-vous vraiment ajouter tous les ingrédients des recettes à cet inventaire ? Les ingrédients existants ne seront pas modifiés.")) {
      try {
        const { data } = await api.post('/ingredients/sync-from-recipes');
        showNotification(data.message, 'success');
        fetchIngredients();
      } catch (err) {
        showNotification("Erreur lors de la synchronisation.", "error");
      }
    }
  }, [showNotification, fetchIngredients]);
  
  const handleDelete = useCallback(async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette matière première ?")) {
      try {
        await api.delete(`/ingredients/${id}`);
        setIngredients(prev => prev.filter(i => i._id !== id));
        showNotification("Ingrédient supprimé.", "info");
      } catch (err) {
        showNotification("Erreur lors de la suppression.", "error");
      }
    }
  }, [showNotification]);

  const isAdmin = user?.role === 'admin';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Inventaire des Matières Premières</Typography>
        {isAdmin &&
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
              {isAdmin && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map(ing => (
              <IngredientRow
                key={ing._id}
                ingredient={ing}
                onStockChange={handleStockChange}
                onSaveStock={handleSaveStock}
                onDelete={handleDelete}
                isAdmin={isAdmin}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Composant mémorisé pour une ligne de produit
const ProductRow = memo(({ product, onStockChange, onSaveStock, lowStockThreshold }) => {
  const [localStock, setLocalStock] = useState(product.editedStock);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalStock(product.editedStock);
  }, [product.editedStock]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleChange = (value) => {
    setLocalStock(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      onStockChange(product._id, value);
    }, 150);
  };

  const handleSave = async () => {
    const stockValue = parseInt(localStock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      return;
    }
    
    // Ne sauvegarder que si la valeur a changé
    if (stockValue === product.stock) {
      return;
    }

    setIsSaving(true);
    try {
      await onSaveStock(product._id, localStock);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Cela déclenchera handleBlur
    }
  };

  return (
    <TableRow key={product._id} hover>
      <TableCell component="th" scope="row">{product.name}</TableCell>
      <TableCell>{product.category}</TableCell>
      <TableCell align="center">
        {product.stock <= lowStockThreshold ? (
          <Chip label="Stock bas" color="error" size="small"/>
        ) : (
          <Chip label="OK" color="success" size="small" />
        )}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: '1rem' }}>{product.stock}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <TextField
            type="number" 
            size="small" 
            value={localStock}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            sx={{ width: '100px' }} 
            inputProps={{ min: 0 }}
          />
          {isSaving && <CircularProgress size={20} />}
        </Box>
      </TableCell>
    </TableRow>
  );
});

ProductRow.displayName = 'ProductRow';

function StockPage() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [deliveryStatus, setDeliveryStatus] = useState({ isActive: false, companyName: '', expectedReceipts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();
  const fetchDataRef = useRef(null);

  const LOW_STOCK_THRESHOLD = 10;

  const categoryOrder = useMemo(() => ["Menus", "Plats", "Boissons", "Desserts", "Partenariat"], []);

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, statusRes, ingredientsRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings/delivery-status'),
        api.get('/ingredients')
      ]);
      
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
  }, [categoryOrder]);

  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
    const handleDataUpdate = (data) => {
      if (data.type === 'PRODUCTS_UPDATED' || data.type === 'TRANSACTIONS_UPDATED' || data.type === 'SETTINGS_UPDATED') {
        fetchDataRef.current();
      }
    };
    socket.on('data-updated', handleDataUpdate);
    return () => {
      socket.off('data-updated', handleDataUpdate);
    };
  }, []);

  const handleStockChange = useCallback((productId, value) => {
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p._id === productId ? { ...p, editedStock: value } : p
      )
    );
  }, []);

  const handleSaveStock = useCallback(async (productId, newStock) => {
    const stockValue = parseInt(newStock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
        showNotification("Veuillez entrer une valeur de stock valide.", "error");
        return;
    }
    try {
      const { data } = await api.put(`/products/restock/${productId}`, { newStock: stockValue });
      // Mise à jour locale au lieu de refetch complet
      setProducts(prev => {
        return prev.map(p => 
          p._id === productId ? { ...p, stock: data.stock, editedStock: data.stock } : p
        );
      });
      // Pas de notification de succès pour éviter les notifications excessives lors de modifications multiples
    } catch (err) {
      showNotification(err.response?.data?.message || "Erreur lors de la mise à jour du stock.", 'error');
      // En cas d'erreur, restaurer la valeur précédente
      setProducts(prev => {
        const product = prev.find(p => p._id === productId);
        if (!product) return prev;
        return prev.map(p => 
          p._id === productId ? { ...p, editedStock: p.stock } : p
        );
      });
    }
  }, [showNotification]);

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0);
  }, [products]);

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
                      <ProductRow
                        key={product._id}
                        product={product}
                        onStockChange={handleStockChange}
                        onSaveStock={handleSaveStock}
                        lowStockThreshold={LOW_STOCK_THRESHOLD}
                      />
                    ))}
                </TableBody>
                </Table>
            </TableContainer>
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