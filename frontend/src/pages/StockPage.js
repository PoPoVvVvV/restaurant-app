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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';

// Composant pour les matières premières
const IngredientManager = () => {
  const { user } = useContext(AuthContext);
  const [ingredients, setIngredients] = useState([]);
  const { showNotification, confirm } = useNotification();
  
  const fetchIngredients = useCallback(async () => {
    try {
        const { data } = await api.get('/ingredients');
        setIngredients(data.map(ing => ({
          ...ing,
          editedStock: ing.stock,
          editedLowStockThreshold: (typeof ing.lowStockThreshold === 'number') ? ing.lowStockThreshold : 500
        })));
    } catch (err) {
        showNotification("Impossible de charger les matières premières.", "error");
    }
  }, [showNotification]);
  
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

  const handleThresholdChange = (id, value) => {
    setIngredients(prev => prev.map(i => i._id === id ? { ...i, editedLowStockThreshold: value } : i));
  };

  const handleSaveStock = useCallback((id) => {
    // Utiliser setIngredients avec une fonction pour obtenir la valeur actuelle
    setIngredients(prevIngredients => {
      const ingredient = prevIngredients.find(i => i._id === id);
      if (!ingredient) return prevIngredients;
      
      const newStock = ingredient.editedStock;
      const parsedStock = parseFloat(newStock);
      
      // Validation
      if (isNaN(parsedStock) || parsedStock < 0) {
        showNotification("Veuillez entrer une valeur de stock valide.", "error");
        return prevIngredients.map(i =>
          i._id === id ? { ...i, editedStock: i.stock } : i
        );
      }
      
      // Si la valeur n'a pas changé, ne rien faire
      if (parsedStock === ingredient.stock) return prevIngredients;
      
      // Mise à jour optimiste immédiate (UI réactive instantanément)
      const updatedIngredients = prevIngredients.map(i =>
        i._id === id ? { ...i, stock: parsedStock, editedStock: parsedStock } : i
      );
      
      // Sauvegarde asynchrone en arrière-plan
      api.put(`/ingredients/${id}/stock`, { stock: parsedStock })
        .then(() => {
          showNotification("Stock de l'ingrédient mis à jour.", "success");
        })
        .catch(err => {
          showNotification("Erreur lors de la mise à jour.", "error");
          // Restaurer la valeur précédente en cas d'erreur
          setIngredients(prevIngredients =>
            prevIngredients.map(i =>
              i._id === id ? { ...i, editedStock: i.stock, stock: i.stock } : i
            )
          );
        });
      
      return updatedIngredients;
    });
  }, [showNotification]);

  const handleSaveThreshold = useCallback((id) => {
    if (user?.role !== 'admin') return;

    setIngredients(prevIngredients => {
      const ingredient = prevIngredients.find(i => i._id === id);
      if (!ingredient) return prevIngredients;

      const newThreshold = ingredient.editedLowStockThreshold;
      const parsedThreshold = parseFloat(newThreshold);

      if (isNaN(parsedThreshold) || parsedThreshold < 0) {
        showNotification("Veuillez entrer un seuil valide (>= 0).", "error");
        return prevIngredients.map(i =>
          i._id === id
            ? { ...i, editedLowStockThreshold: (typeof i.lowStockThreshold === 'number') ? i.lowStockThreshold : 500 }
            : i
        );
      }

      const currentThreshold = (typeof ingredient.lowStockThreshold === 'number') ? ingredient.lowStockThreshold : 500;
      if (parsedThreshold === currentThreshold) return prevIngredients;

      const updatedIngredients = prevIngredients.map(i =>
        i._id === id
          ? { ...i, lowStockThreshold: parsedThreshold, editedLowStockThreshold: parsedThreshold }
          : i
      );

      api.put(`/ingredients/${id}`, { lowStockThreshold: parsedThreshold })
        .then(() => {
          showNotification("Seuil de stock bas mis à jour.", "success");
        })
        .catch(() => {
          showNotification("Erreur lors de la mise à jour du seuil.", "error");
          setIngredients(prev =>
            prev.map(i =>
              i._id === id
                ? { ...i, editedLowStockThreshold: (typeof i.lowStockThreshold === 'number') ? i.lowStockThreshold : 500 }
                : i
            )
          );
        });

      return updatedIngredients;
    });
  }, [showNotification, user?.role]);

  const handleSync = async () => {
    const shouldSync = await confirm(
      "Voulez-vous vraiment ajouter tous les ingrédients des recettes à cet inventaire ? Les ingrédients existants ne seront pas modifiés.",
      {
        title: 'Confirmer la synchronisation',
        severity: 'warning',
        confirmText: 'Synchroniser',
        cancelText: 'Annuler'
      }
    );
    if (shouldSync) {
      try {
        const { data } = await api.post('/ingredients/sync-from-recipes');
        showNotification(data.message, 'success');
      } catch (err) {
        showNotification("Erreur lors de la synchronisation.", "error");
      }
    }
  };
  
  const handleDelete = async (id) => {
    const shouldDelete = await confirm(
      "Voulez-vous vraiment supprimer cette matière première ?",
      {
        title: 'Confirmer la suppression',
        severity: 'error',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
      }
    );
    if (shouldDelete) {
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
              <TableCell align="right">Seuil stock bas</TableCell>
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
                <TableCell align="right">
                  {user?.role === 'admin' ? (
                    <TextField
                      size="small"
                      type="number"
                      value={ing.editedLowStockThreshold}
                      onChange={(e) => handleThresholdChange(ing._id, e.target.value)}
                      onBlur={() => handleSaveThreshold(ing._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      sx={{ width: '120px' }}
                      inputProps={{ min: 0 }}
                    />
                  ) : (
                    (typeof ing.lowStockThreshold === 'number') ? ing.lowStockThreshold : 500
                  )}
                </TableCell>
                <TableCell align="center">
                  {ing.stock <= ((typeof ing.lowStockThreshold === 'number') ? ing.lowStockThreshold : 500) && (<span title="Stock bas">⚠️</span>)}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <TextField 
                      size="small" 
                      type="number" 
                      value={ing.editedStock} 
                      onChange={(e) => handleStockChange(ing._id, e.target.value)}
                      onBlur={() => handleSaveStock(ing._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      sx={{ width: '100px' }} 
                    />
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
    </Box>
  );
};

function StockPage() {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [deliveryStatus, setDeliveryStatus] = useState({ isActive: false, companyName: '', expectedReceipts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, statusRes, ingredientsRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings/delivery-status'),
        api.get('/ingredients')
      ]);
      
  const categoryOrder = ["Menus", "Plats", "Boissons", "Desserts", "Partenariat"];
      const sortedProducts = productsRes.data.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.category);
        const indexB = categoryOrder.indexOf(b.category);
        return indexA - indexB;
      });
      
      const productsWithEdit = sortedProducts.map(p => ({
        ...p,
        editedStock: p.stock,
        editedLowStockThreshold: (typeof p.lowStockThreshold === 'number') ? p.lowStockThreshold : 10
      }));
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

  const handleProductThresholdChange = (productId, value) => {
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p._id === productId ? { ...p, editedLowStockThreshold: value } : p
      )
    );
  };

  const handleSaveStock = useCallback((productId) => {
    // Utiliser setProducts avec une fonction pour obtenir la valeur actuelle
    setProducts(prevProducts => {
      const product = prevProducts.find(p => p._id === productId);
      if (!product) return prevProducts;
      
      const newStock = product.editedStock;
      const parsedStock = parseInt(newStock, 10);
      
      // Validation
      if (isNaN(parsedStock) || parsedStock < 0) {
        showNotification("Veuillez entrer une valeur de stock valide.", "error");
        return prevProducts.map(p =>
          p._id === productId ? { ...p, editedStock: p.stock } : p
        );
      }
      
      // Si la valeur n'a pas changé, ne rien faire
      if (parsedStock === product.stock) return prevProducts;
      
      // Mise à jour optimiste immédiate (UI réactive instantanément)
      const updatedProducts = prevProducts.map(p =>
        p._id === productId ? { ...p, stock: parsedStock, editedStock: parsedStock } : p
      );
      
      // Sauvegarde asynchrone en arrière-plan
      api.put(`/products/restock/${productId}`, { newStock: parsedStock })
        .then(() => {
          showNotification(`${product.name} mis à jour !`, 'success');
        })
        .catch(err => {
          showNotification("Erreur lors de la mise à jour du stock.", 'error');
          // Restaurer la valeur précédente en cas d'erreur
          setProducts(prevProducts =>
            prevProducts.map(p =>
              p._id === productId ? { ...p, editedStock: p.stock, stock: p.stock } : p
            )
          );
        });
      
      return updatedProducts;
    });
  }, [showNotification]);

  const handleSaveProductThreshold = useCallback((productId) => {
    setProducts(prevProducts => {
      const product = prevProducts.find(p => p._id === productId);
      if (!product) return prevProducts;

      const newThreshold = product.editedLowStockThreshold;
      const parsedThreshold = parseInt(newThreshold, 10);

      if (isNaN(parsedThreshold) || parsedThreshold < 0) {
        showNotification("Veuillez entrer un seuil valide (>= 0).", "error");
        return prevProducts.map(p =>
          p._id === productId
            ? { ...p, editedLowStockThreshold: (typeof p.lowStockThreshold === 'number') ? p.lowStockThreshold : 10 }
            : p
        );
      }

      const currentThreshold = (typeof product.lowStockThreshold === 'number') ? product.lowStockThreshold : 10;
      if (parsedThreshold === currentThreshold) return prevProducts;

      const updatedProducts = prevProducts.map(p =>
        p._id === productId
          ? { ...p, lowStockThreshold: parsedThreshold, editedLowStockThreshold: parsedThreshold }
          : p
      );

      api.put(`/products/${productId}`, { lowStockThreshold: parsedThreshold })
        .then(() => {
          showNotification("Seuil de stock bas du produit mis à jour.", "success");
        })
        .catch(() => {
          showNotification("Erreur lors de la mise à jour du seuil.", "error");
          setProducts(prev =>
            prev.map(p =>
              p._id === productId
                ? { ...p, editedLowStockThreshold: (typeof p.lowStockThreshold === 'number') ? p.lowStockThreshold : 10 }
                : p
            )
          );
        });

      return updatedProducts;
    });
  }, [showNotification]);

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {deliveryStatus.isActive && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 4,
            borderRadius: 3,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(59, 130, 246, 0.15)'
              : 'rgba(59, 130, 246, 0.1)',
            border: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(59, 130, 246, 0.3)'
              : '1px solid rgba(59, 130, 246, 0.2)',
          }}
        >
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography 
          variant="h4" 
          component="h1"
          sx={{
            fontWeight: 700,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          Gestion des Stocks
        </Typography>
        <Paper 
          elevation={0}
          sx={{ 
            p: 2.5,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
            border: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(99, 102, 241, 0.3)'
              : '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Valeur Totale Produits : ${totalStockValue.toFixed(2)}
          </Typography>
        </Paper>
      </Box>

      <Accordion 
        defaultExpanded
        sx={{
          mb: 2,
          borderRadius: 3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.5)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          '&:before': {
            display: 'none',
          },
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />}
          sx={{
            '& .MuiAccordionSummary-content': {
              my: 2,
            },
          }}
        >
          <Typography 
            variant="h5"
            sx={{
              fontWeight: 600,
              fontSize: '1.5rem',
            }}
          >
            Stocks Produits Finis
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
            <TableContainer 
              component={Paper} 
              elevation={0}
              sx={{
                borderRadius: 2,
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.5)'
                  : 'rgba(255, 255, 255, 0.9)',
                border: (theme) => theme.palette.mode === 'dark'
                  ? '1px solid rgba(148, 163, 184, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              }}
            >
                <Table>
                <TableHead>
                    <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Produit</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Catégorie</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Statut</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Stock Actuel</TableCell>
                    {user?.role === 'admin' && (
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Seuil stock bas</TableCell>
                    )}
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Modifier le Stock</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {products.map((product) => (
                    <TableRow key={product._id} hover>
                        <TableCell component="th" scope="row">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell align="center">
                        {product.stock <= ((typeof product.lowStockThreshold === 'number') ? product.lowStockThreshold : 10)
                          ? (<Chip label="Stock bas" color="error" size="small"/>)
                          : (<Chip label="OK" color="success" size="small" />)
                        }
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '1rem' }}>{product.stock}</TableCell>
                        {user?.role === 'admin' && (
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <TextField
                                type="number"
                                size="small"
                                value={product.editedLowStockThreshold}
                                onChange={(e) => handleProductThresholdChange(product._id, e.target.value)}
                                onBlur={() => handleSaveProductThreshold(product._id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                sx={{ width: '110px' }}
                                inputProps={{ min: 0 }}
                              />
                            </Box>
                          </TableCell>
                        )}
                        <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TextField
                            type="number" size="small" value={product.editedStock}
                            onChange={(e) => handleStockChange(product._id, e.target.value)}
                            onBlur={() => handleSaveStock(product._id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            sx={{ width: '100px' }} inputProps={{ min: 0 }}
                            />
                        </Box>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </TableContainer>
        </AccordionDetails>
      </Accordion>
      
      <Accordion
        sx={{
          borderRadius: 3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.5)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          '&:before': {
            display: 'none',
          },
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />}
          sx={{
            '& .MuiAccordionSummary-content': {
              my: 2,
            },
          }}
        >
          <Typography 
            variant="h5"
            sx={{
              fontWeight: 600,
              fontSize: '1.5rem',
            }}
          >
            Inventaire des Matières Premières
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <IngredientManager />
        </AccordionDetails>
      </Accordion>
      
    </Container>
  );
}

export default StockPage;