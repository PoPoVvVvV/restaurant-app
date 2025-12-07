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
      const items = cart.map(item => ({
        product: item._id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      }));

      await api.post('/christmas-transactions', { items });
      
      showNotification("Commande passée avec succès!", "success");
      setCart([]);
      
      // Mettre à jour les stocks
      socket.emit('data-updated', { type: 'CHRISTMAS_TRANSACTIONS_UPDATED' });
    } catch (err) {
      showNotification("Erreur lors de la commande: " + (err.response?.data?.message || err.message), "error");
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
      
      <Grid container spacing={3}>
        {/* Liste des produits */}
        <Grid item xs={12} md={8}>
          {Object.entries(productsByCategory).map(([category, products]) => (
            products.length > 0 && (
              <Box key={category} mb={4}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {category}
                </Typography>
                <Grid container spacing={2}>
                  {products.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product._id}>
                      <Card variant="outlined">
                        <CardActionArea onClick={() => addToCart(product)}>
                          <CardContent>
                            <Typography variant="h6" component="div">
                              {product.name}
                            </Typography>
                            <Typography color="text.secondary">
                              ${product.price.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
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

        {/* Panier */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 20 }}>
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
                          <Box display="flex" alignItems="center">
                            <IconButton 
                              size="small" 
                              onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <RemoveCircleOutlineIcon />
                            </IconButton>
                            <TextField
                              size="small"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCartQuantity(item._id, e.target.value)}
                              inputProps={{ min: 1, max: item.stock, style: { textAlign: 'center', width: '50px' } }}
                              variant="standard"
                            />
                            <IconButton 
                              size="small" 
                              onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <AddCircleOutlineIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => removeFromCart(item._id)}
                              sx={{ ml: 1 }}
                            >
                              ×
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={`${item.name}`}
                          secondary={`$${(item.price * item.quantity).toFixed(2)}`}
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
