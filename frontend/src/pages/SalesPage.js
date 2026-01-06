import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import {
  Box, Grid, Card, CardActionArea, CardContent, Typography, Paper, List, ListItem, ListItemText,
  Divider, Button, CircularProgress, TextField, IconButton, Alert, AlertTitle, Checkbox, FormControlLabel
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

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Grid container spacing={3}>
        {/* Colonne de gauche : Produits */}
        <Grid item xs={12} md={8}>
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
          
          {Object.entries(productsByCategory).map(([category, items]) => (
            items.length > 0 && (
              <Box key={category} sx={{ mb: 4 }}>
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    mb: 3,
                    fontSize: '1.75rem',
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                      : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {category}
                </Typography>
                <Grid container spacing={2.5}>
                  {items.map((product, index) => (
                    <Grid item key={product._id} xs={6} sm={4} md={3}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          animation: `fadeIn 0.4s ease-out ${index * 0.05}s both`,
                        }}
                      >
                        <CardActionArea 
                          onClick={() => addToCart(product)} 
                          sx={{ 
                            height: '100%',
                            '&:active': {
                              transform: 'scale(0.98)',
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Typography 
                              variant="subtitle1" 
                              component="div" 
                              sx={{ 
                                fontWeight: 600,
                                mb: 1,
                                fontSize: '1rem',
                              }}
                            >
                              {product.name}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                mb: 1.5,
                                fontSize: '0.85rem',
                              }}
                            >
                              Stock: {product.stock}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                mt: 1,
                                fontWeight: 700,
                                background: (theme) => theme.palette.mode === 'dark'
                                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                  : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }}
                            >
                              ${product.price.toFixed(2)}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )
          ))}
        </Grid>

        {/* Colonne de droite : Commande */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              position: 'sticky', 
              top: '20px',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 3,
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 20px 60px rgba(0, 0, 0, 0.4)'
                : '0 20px 60px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Typography 
              variant="h5" 
              gutterBottom
              sx={{
                fontWeight: 700,
                mb: 3,
                fontSize: '1.5rem',
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              Commande en cours
            </Typography>

            {freeMenus.length > 0 && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(16, 185, 129, 0.1)',
                  border: (theme) => theme.palette.mode === 'dark'
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <AlertTitle sx={{ fontWeight: 600 }}>🎉 Promotion 5 achetés = 1 offert</AlertTitle>
                Vous devez offrir :
                {freeMenus.map(menu => (
                  <strong key={menu.name} style={{ display: 'block', marginTop: '8px' }}>
                    {menu.freeCount} x {menu.name}
                  </strong>
                ))}
              </Alert>
            )}

            {cart.length === 0 ? (
              <Typography>La commande est vide.</Typography>
            ) : (
              <>
                <List sx={{ maxHeight: '55vh', overflow: 'auto' }}>
                  {cart.map(item => (
                    <ListItem key={item._id} disablePadding sx={{ mb: 1 }}>
                      <ListItemText primary={item.name} />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton size="small" onClick={() => updateCartQuantity(item._id, item.quantity - 1)}><RemoveCircleOutlineIcon fontSize="small" /></IconButton>
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
                        <IconButton size="small" onClick={() => updateCartQuantity(item._id, item.quantity + 1)}><AddCircleOutlineIcon fontSize="small" /></IconButton>
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
                <Box sx={{ textAlign: 'right' }}>
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
                  <Typography variant="body2" color="text.secondary">Marge brute: ${margin.toFixed(2)}</Typography>
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  sx={{ 
                    mt: 3,
                    py: 1.5,
                    fontSize: '1rem',
                    borderRadius: 2,
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    '&:hover': {
                      background: (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                        : 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                    },
                  }} 
                  onClick={handleSaveTransaction} 
                  disabled={loading || cart.length === 0}
                >
                  {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
                </Button>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SalesPage;