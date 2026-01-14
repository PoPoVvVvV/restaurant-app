import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import {
  Box, Grid, Typography, Paper, List, ListItem, ListItemText,
  Divider, Button, CircularProgress, TextField, IconButton, Checkbox, FormControlLabel
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [splitPayment, setSplitPayment] = useState(false);
  const { showNotification } = useNotification();

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data.filter(p => p.stock > 0));
    } catch (err) {
      setError("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const handleDataUpdate = (data) => {
      if (data.type === 'PRODUCTS_UPDATED' || data.type === 'TRANSACTIONS_UPDATED') {
        fetchProducts();
      }
    };
    
    socket.on('data-updated', handleDataUpdate);

    return () => {
      socket.off('data-updated', handleDataUpdate);
    };
  }, [fetchProducts]);

  const productsByCategory = useMemo(() => {
  const grouped = { Menus: [], Plats: [], Boissons: [], Desserts: [], Partenariat: [] };
    const sortedProducts = [...products].sort((a, b) => a.price - b.price);
    sortedProducts.forEach(product => {
      if (grouped[product.category]) {
        grouped[product.category].push(product);
      }
    });
    return grouped;
  }, [products]);
  
  const freeMenus = useMemo(() => {
    return cart
      .filter(item => item.category === 'Menus')
      .map(item => ({
        name: item.name,
        freeCount: Math.floor(item.quantity / 5),
      }))
      .filter(item => item.freeCount > 0);
  }, [cart]);

  const addToCart = useCallback((product) => {
    setCart(prevCart => {
      const itemInCart = prevCart.find(item => item._id === product._id);
      if (itemInCart && itemInCart.quantity >= product.stock) {
        showNotification("Stock maximum atteint pour ce produit.", "warning");
        return prevCart;
      }
      const existingProduct = prevCart.find(item => item._id === product._id);
      if (existingProduct) {
        return prevCart.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  }, [showNotification]);

  const updateCartQuantity = useCallback((productId, newQuantity) => {
    const productInCatalog = products.find(p => p._id === productId);
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      setCart(prevCart => prevCart.filter(item => item._id !== productId));
      return;
    }
    if (quantity > productInCatalog.stock) {
      showNotification(`Stock maximum pour ${productInCatalog.name} : ${productInCatalog.stock}`, "warning");
      setCart(prevCart => prevCart.map(item => item._id === productId ? { ...item, quantity: productInCatalog.stock } : item));
      return;
    }
    setCart(prevCart => prevCart.map(item => item._id === productId ? { ...item, quantity: quantity } : item));
  }, [products, showNotification]);

  const handleSaveTransaction = useCallback(async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data } = await api.post('/transactions', { cart });
      showNotification(data.message, 'success');
      setCart([]);
      fetchProducts();
    } catch (err) {
      showNotification(err.response?.data?.message || "Une erreur est survenue.", 'error');
    } finally {
      setLoading(false);
    }
  }, [cart, fetchProducts, showNotification]);

  const totalAmount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0), 
    [cart]
  );
  
  const margin = useMemo(() => 
    totalAmount - cart.reduce((sum, item) => sum + item.cost * item.quantity, 0), 
    [totalAmount, cart]
  );

  // Taille uniforme pour toutes les catégories
  const getBoxSize = () => {
    return { width: '120px', height: '100px' };
  };

  // Ordre des catégories selon le plan
  const categoryOrder = ['Menus', 'Plats', 'Boissons', 'Desserts', 'Partenariat'];

  return (
    <Box sx={{ width: '100%', p: 3, display: 'flex', gap: 4 }}>
      {/* Colonne de gauche : Produits */}
      <Box sx={{ flex: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'error.light' }}>
            {error}
          </Typography>
        )}
        
        {categoryOrder.map((category) => {
          const items = productsByCategory[category] || [];
          if (items.length === 0) return null;

          // Limiter à 5 items maximum par catégorie
          const displayItems = items.slice(0, 5);

          return (
            <Box key={category} sx={{ mb: 4 }}>
              <Typography 
                variant="h6" 
                sx={{
                  mb: 2,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                }}
              >
                {category === 'Partenariat' ? 'Menu Partinariat' : category}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {displayItems.map((product) => {
                  const boxSize = getBoxSize();
                  return (
                    <Box
                      key={product._id}
                      onClick={() => addToCart(product)}
                      sx={{
                        ...boxSize,
                        border: '2px solid',
                        borderColor: (theme) => theme.palette.mode === 'dark' 
                          ? 'rgba(148, 163, 184, 0.3)' 
                          : 'rgba(0, 0, 0, 0.2)',
                        borderRadius: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                          ? 'rgba(30, 41, 59, 0.5)'
                          : 'rgba(255, 255, 255, 0.8)',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: (theme) => theme.palette.primary.main,
                          backgroundColor: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(30, 41, 59, 0.8)'
                            : 'rgba(255, 255, 255, 1)',
                          transform: 'scale(1.05)',
                        },
                        '&:active': {
                          transform: 'scale(0.98)',
                        },
                        p: 1,
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          textAlign: 'center',
                          fontSize: '0.85rem',
                          mb: 0.5,
                        }}
                      >
                        {product.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.7rem',
                          color: 'text.secondary',
                        }}
                      >
                        ${product.price.toFixed(2)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Colonne de droite : Commandes en cours */}
      <Box sx={{ width: '300px' }}>
        <Typography 
          variant="h6" 
          sx={{
            mb: 3,
            fontSize: '1.2rem',
            fontWeight: 600,
          }}
        >
          Commandes en cours
        </Typography>

        {freeMenus.length > 0 && (
          <Box 
            sx={{ 
              mb: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(16, 185, 129, 0.1)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              🎉 Promotion 5 achetés = 1 offert
            </Typography>
            {freeMenus.map(menu => (
              <Typography key={menu.name} variant="body2" sx={{ display: 'block', mt: 0.5 }}>
                <strong>{menu.freeCount} x {menu.name}</strong>
              </Typography>
            ))}
          </Box>
        )}

        {cart.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            La commande est vide.
          </Typography>
        ) : (
          <>
            <List sx={{ maxHeight: '55vh', overflow: 'auto', mb: 2 }}>
              {cart.map(item => (
                <ListItem key={item._id} disablePadding sx={{ mb: 1 }}>
                  <ListItemText 
                    primary={item.name} 
                    secondary={`${item.quantity} x $${item.price.toFixed(2)}`}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton 
                      size="small" 
                      onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                    >
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCartQuantity(item._id, e.target.value)}
                      sx={{
                        width: `${(item.quantity.toString().length * 10) + 30}px`,
                        minWidth: '50px',
                        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                          '-webkit-appearance': 'none',
                          margin: 0,
                        },
                        '& input[type=number]': {
                          '-moz-appearance': 'textfield',
                        },
                      }}
                      inputProps={{ style: { textAlign: 'center', fontSize: '1rem' }}}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                    >
                      <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'left', mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={splitPayment} 
                    onChange={(e) => setSplitPayment(e.target.checked)}
                    color="primary"
                  />
                }
                label="Décomposer le paiement (max 750$ par versement)"
              />
            </Box>
            <Box sx={{ textAlign: 'right', mb: 2 }}>
              {splitPayment && totalAmount > 0 ? (
                <Box sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>Décomposition du paiement :</Typography>
                  {Array.from({ length: Math.ceil(totalAmount / 750) }).map((_, index) => {
                    const amount = index === Math.ceil(totalAmount / 750) - 1 
                      ? (totalAmount % 750 || 750).toFixed(2)
                      : '750.00';
                    return (
                      <Typography key={index} variant="body2">
                        Paiement {index + 1}: ${amount}
                      </Typography>
                    );
                  })}
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Total: ${totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="h6">Total: ${totalAmount.toFixed(2)}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Marge brute: ${margin.toFixed(2)}
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              fullWidth 
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                borderRadius: 2,
              }} 
              onClick={handleSaveTransaction} 
              disabled={loading || cart.length === 0}
            >
              {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}

export default SalesPage;