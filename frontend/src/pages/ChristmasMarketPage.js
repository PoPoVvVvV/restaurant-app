import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import {
  Box, Grid, Card, CardActionArea, CardContent, Typography, Paper, List, ListItem, ListItemText,
  Divider, Button, CircularProgress, TextField, IconButton, Alert, AlertTitle, Container
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloseIcon from '@mui/icons-material/Close';

function ChristmasMarketPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/christmas-products');
      setProducts(data.filter(p => p.stock > 0));
    } catch (err) {
      setError("Impossible de charger les produits du Marché de Noël.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const handleDataUpdate = (data) => {
      if (data.type === 'CHRISTMAS_PRODUCTS_UPDATED' || data.type === 'CHRISTMAS_TRANSACTIONS_UPDATED') {
        fetchProducts();
      }
    };
    
    socket.on('data-updated', handleDataUpdate);

    return () => {
      socket.off('data-updated', handleDataUpdate);
    };
  }, [fetchProducts]);

  const productsByCategory = useMemo(() => {
    const grouped = { 'Charcuteries': [], 'Fromages': [], 'Boissons': [], 'Desserts': [], 'Plateaux': [] };
    const sortedProducts = [...products].sort((a, b) => a.price - b.price);
    sortedProducts.forEach(product => {
      if (grouped[product.category]) {
        grouped[product.category].push(product);
      }
    });
    return grouped;
  }, [products]);

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

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== productId));
  }, []);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  }, [cart]);

  const handleCheckout = async () => {
    try {
      // Préparer les données de la transaction
      const items = cart.map(item => ({
        product: item._id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        category: item.category
      }));

      // Envoyer la requête avec les données complètes
      const response = await api.post('/christmas-transactions', { 
        items,
        employeeIds: [] // Peut être utilisé pour les ventes en équipe
      });
      
      // Afficher le message de succès
      showNotification(response.data.message || "Commande passée avec succès!", "success");
      
      // Vider le panier
      setCart([]);
      
      // Mettre à jour les données en temps réel
      socket.emit('data-updated', { 
        type: 'CHRISTMAS_TRANSACTIONS_UPDATED',
        transactionIds: response.data.transactions?.map(t => t._id) || []
      });
      
      // Recharger les produits pour mettre à jour les stocks
      fetchProducts();
      
    } catch (err) {
      console.error('Erreur lors de la commande:', err);
      showNotification(
        `Erreur: ${err.response?.data?.message || err.message}`, 
        "error"
      );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Erreur</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Marché de Noël
      </Typography>
      
      <Grid container spacing={2}>
        {/* Liste des produits */}
        <Grid item xs={12} md={8} lg={9} sx={{ pr: { md: 3 } }}>
          {Object.entries(productsByCategory).map(([category, products]) => (
            products.length > 0 && (
              <Box key={category} mb={4}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {category}
                </Typography>
                <Grid container spacing={1} sx={{ justifyContent: 'space-between' }}>
                  {products.map((product) => (
                    <Grid item xs={12} sm={4} md={2.2} key={product._id} sx={{ minWidth: '150px', flexGrow: 1 }}>
                      <Card variant="outlined">
                        <CardActionArea onClick={() => addToCart(product)}>
                          <CardContent>
                            <Typography variant="h6" component="div">
                              {product.name}
                            </Typography>
                            <Typography variant="h6" color="error" fontWeight="bold" sx={{ mt: 1, textShadow: '0 0 2px rgba(0,0,0,0.2)' }}>
                              ${product.price.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="warning.main" fontWeight="medium" sx={{ 
                              backgroundColor: 'rgba(255, 255, 0, 0.1)',
                              display: 'inline-block',
                              px: 1,
                              borderRadius: 1,
                              mt: 0.5
                            }}>
                              Stock: {product.stock}
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

        {/* Panier - Position fixe à droite */}
        <Grid item xs={12} md={4} lg={3} sx={{ position: 'sticky', top: 20, height: 'fit-content', pr: 0 }}>
          <Paper elevation={3} sx={{ p: 3, position: 'sticky', top: 20, minWidth: '380px', maxWidth: '100%', ml: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Votre panier
            </Typography>
            
            {cart.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                Votre panier est vide
              </Typography>
            ) : (
              <>
                <List>
                  {cart.map((item) => (
                    <React.Fragment key={item._id}>
                      <ListItem 
                        secondaryAction={
                          <Box display="flex" alignItems="center" sx={{ gap: 0.5, flexWrap: 'nowrap', minWidth: '180px', justifyContent: 'flex-end' }}>
                            <IconButton 
                              size="small" 
                              onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              sx={{ p: 0.5, minWidth: '28px', height: '28px' }}
                            >
                              <RemoveCircleOutlineIcon fontSize="small" />
                            </IconButton>
                            <TextField
                              size="small"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCartQuantity(item._id, e.target.value)}
                              inputProps={{ 
                                min: 1, 
                                max: item.stock,
                                style: { 
                                  padding: '4px 0',
                                  textAlign: 'center',
                                  width: '40px',
                                  WebkitAppearance: 'none',
                                  MozAppearance: 'textfield',
                                  margin: 0,
                                  fontSize: '0.875rem'
                                }
                              }}
                              variant="outlined"
                              sx={{ 
                                width: '60px',
                                '& .MuiOutlinedInput-root': { 
                                  height: '28px',
                                  padding: '0 2px',
                                  '& fieldset': {
                                    padding: '0 4px'
                                  }
                                },
                                '& input': {
                                  padding: '4px 0',
                                  textAlign: 'center',
                                  '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0
                                  }
                                }
                              }}
                            />
                            <IconButton 
                              size="small" 
                              onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              sx={{ p: 0.5, minWidth: '28px', height: '28px' }}
                            >
                              <AddCircleOutlineIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => removeFromCart(item._id)}
                              sx={{ p: 0.5, minWidth: '28px', height: '28px' }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText 
                          primary={
                            <Typography variant="body1" fontWeight="medium" noWrap sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, fontSize: '0.875rem' }}>
                              <span>${item.price.toFixed(2)} × {item.quantity}</span>
                              <span style={{ fontWeight: 500, marginLeft: '8px' }}>${(item.price * item.quantity).toFixed(2)}</span>
                            </Box>
                          }
                          sx={{ 
                            mr: 2,
                            '& .MuiListItemText-secondary': {
                              overflow: 'visible',
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
                
                <Box mt={2} textAlign="right">
                  <Typography variant="h6">
                    Total: ${total}
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    sx={{ mt: 2 }}
                  >
                    Valider la commande
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ChristmasMarketPage;
