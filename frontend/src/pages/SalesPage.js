import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import {
  Box, Grid, Card, CardActionArea, CardContent, Typography, Paper, List, ListItem, ListItemText,
  Divider, Button, CircularProgress, TextField, IconButton, Alert, AlertTitle
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const ProductCard = React.memo(({ product, onAddToCart }) => (
  <Card sx={{ height: '100%' }}>
    <CardActionArea onClick={() => onAddToCart(product)} sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>{product.name}</Typography>
        <Typography variant="body2" color="text.secondary">Stock: {product.stock}</Typography>
        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>${product.price.toFixed(2)}</Typography>
      </CardContent>
    </CardActionArea>
  </Card>
));

const CartItem = React.memo(({ item, onUpdateQuantity }) => (
  <ListItem disablePadding sx={{ mb: 1 }}>
    <ListItemText primary={item.name} />
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton size="small" onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}>
        <RemoveCircleOutlineIcon fontSize="small" />
      </IconButton>
      <TextField
        size="small"
        type="number"
        value={item.quantity}
        onChange={(e) => onUpdateQuantity(item._id, e.target.value)}
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
      <IconButton size="small" onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}>
        <AddCircleOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  </ListItem>
));

function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();
  
  // Cache des produits du panier pour lookup rapide
  const cartMap = useMemo(() => {
    return cart.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});
  }, [cart]);

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
    const itemInCart = cartMap[product._id];
    if (itemInCart && itemInCart.quantity >= product.stock) {
      showNotification("Stock maximum atteint pour ce produit.", "warning");
      return;
    }
    setCart(prevCart => {
      const existingProduct = prevCart.find(item => item._id === product._id);
      if (existingProduct) {
        return prevCart.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  }, [cartMap, showNotification]);

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

  const handleSaveTransaction = async () => {
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
  };

  const { totalAmount, margin } = useMemo(() => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const marginVal = total - cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);
    return { totalAmount: total, margin: marginVal };
  }, [cart]);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Grid container spacing={2}>
        {/* Colonne de gauche : Produits */}
        <Grid item xs={12} md={8}>
          {loading && <CircularProgress />}
          {error && <Typography color="error">{error}</Typography>}
          
          {Object.entries(productsByCategory).map(([category, items]) => (
            items.length > 0 && (
              <Box key={category} sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom component="h2">{category}</Typography>
                <Grid container spacing={2}>
                  {items.map(product => (
                    <Grid item key={product._id} xs={6} sm={4} md={3}>
                      <ProductCard product={product} onAddToCart={addToCart} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )
          ))}
        </Grid>

        {/* Colonne de droite : Commande */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: '20px' }}>
            <Typography variant="h5" gutterBottom>Commande en cours</Typography>

            {freeMenus.length > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Promotion 5 achetés = 1 offert</AlertTitle>
                Vous devez offrir :
                {freeMenus.map(menu => (
                  <strong key={menu.name} style={{ display: 'block' }}>
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
                    <CartItem key={item._id} item={item} onUpdateQuantity={updateCartQuantity} />
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">Total: ${totalAmount.toFixed(2)}</Typography>
                  <Typography variant="body2" color="text.secondary">Marge brute: ${margin.toFixed(2)}</Typography>
                </Box>
                <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} onClick={handleSaveTransaction} disabled={loading || cart.length === 0}>
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