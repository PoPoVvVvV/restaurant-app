import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

// Imports depuis Material-UI
import {
  Box, Grid, Card, CardActionArea, CardContent, Typography, Paper, List, ListItem, ListItemText,
  Divider, Button, CircularProgress, TextField, IconButton
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data.filter(p => p.stock > 0));
    } catch (err) {
      setError("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const productsByCategory = useMemo(() => {
    const grouped = { Menus: [], Plats: [], Boissons: [], Desserts: [] };
    products.forEach(product => {
      if (grouped[product.category]) {
        grouped[product.category].push(product);
      }
    });
    return grouped;
  }, [products]);

  const addToCart = (product) => {
    const itemInCart = cart.find(item => item._id === product._id);
    if (itemInCart && itemInCart.quantity >= product.stock) {
      alert("Stock maximum atteint pour ce produit.");
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
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const productInCatalog = products.find(p => p._id === productId);
    const quantity = parseInt(newQuantity, 10);

    if (isNaN(quantity) || quantity < 1) {
      setCart(prevCart => prevCart.filter(item => item._id !== productId));
      return;
    }

    if (quantity > productInCatalog.stock) {
      alert(`Stock maximum pour ${productInCatalog.name} : ${productInCatalog.stock}`);
      setCart(prevCart =>
        prevCart.map(item =>
          item._id === productId ? { ...item, quantity: productInCatalog.stock } : item
        )
      );
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item._id === productId ? { ...item, quantity: quantity } : item
      )
    );
  };

  const handleSaveTransaction = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data } = await api.post('/transactions', { cart });
      alert(data.message);
      setCart([]);
      fetchProducts();
    } catch (err) {
      alert("Erreur: " + err.response?.data?.message || "Une erreur inconnue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const margin = totalAmount - cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  return (
    // LA CORRECTION EST ICI : Le Box principal prend maintenant toute la largeur.
    <Box sx={{ width: '100%', p: 2 }}>
      <Grid container spacing={3}>
        {/* Colonne de gauche : Liste des produits */}
        <Grid item xs={12} md={8}>
          {loading && <CircularProgress />}
          {error && <Typography color="error">{error}</Typography>}
          
          {Object.entries(productsByCategory).map(([category, items]) => (
            items.length > 0 && (
              <Box key={category} sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom component="h2">{category}</Typography>
                <Grid container spacing={2}>
                  {items.map(product => (
                    <Grid item key={product._id} xs={12} sm={6} md={4} lg={3}>
                      <Card>
                        <CardActionArea onClick={() => addToCart(product)}>
                          <CardContent>
                            <Typography gutterBottom variant="h6" component="div">{product.name}</Typography>
                            <Typography variant="body2" color="text.secondary">Stock: {product.stock}</Typography>
                            <Typography variant="h5" color="primary" sx={{ mt: 1 }}>${product.price.toFixed(2)}</Typography>
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

        {/* Colonne de droite : Panier */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: '84px' }}>
            <Typography variant="h5" gutterBottom>Commande en cours</Typography>
            {cart.length === 0 ? (
              <Typography>La commande est vide.</Typography>
            ) : (
              <>
                <List sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                  {cart.map(item => (
                    <ListItem key={item._id} disablePadding sx={{ mb: 2 }}>
                      <ListItemText primary={item.name} secondary={`$${item.price.toFixed(2)}/unité`} />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton size="small" onClick={() => updateCartQuantity(item._id, item.quantity - 1)}><RemoveCircleOutlineIcon /></IconButton>
                        <TextField
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item._id, e.target.value)}
                          sx={{ width: '55px', mx: 0.5 }}
                          inputProps={{ style: { textAlign: 'center' }}}
                        />
                        <IconButton size="small" onClick={() => updateCartQuantity(item._id, item.quantity + 1)}><AddCircleOutlineIcon /></IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">Total: ${totalAmount.toFixed(2)}</Typography>
                  <Typography variant="body2" color="text.secondary">Marge brute: ${margin.toFixed(2)}</Typography>
                </Box>
                <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} onClick={handleSaveTransaction} disabled={loading || cart.length === 0}>
                  {loading ? <CircularProgress size={24} /> : 'Enregistrer la transaction'}
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