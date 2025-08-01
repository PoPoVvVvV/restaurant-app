import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import {
  Box, Grid, Card, CardActionArea, CardContent, Typography, Paper, List, ListItem, ListItemText,
  Divider, Button, CircularProgress, TextField, IconButton, Select, MenuItem, FormControl, InputLabel,
  OutlinedInput, Chip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

function CorporateSalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, usersRes] = await Promise.all([
        api.get('/products'),
        api.get('/users')
      ]);
      setProducts(productsRes.data);
      setUsers(usersRes.data.filter(u => u.isActive));
    } catch (err) {
      setError("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, []);

  const getPrice = (product) => {
    return (product.corporatePrice && product.corporatePrice > 0) ? product.corporatePrice : product.price;
  };

  useEffect(() => {
    fetchData();
    const handleDataUpdate = (data) => {
      if (data.type === 'PRODUCTS_UPDATED' || data.type === 'USERS_UPDATED') {
        fetchData();
      }
    };
    socket.on('data-updated', handleDataUpdate);
    return () => {
      socket.off('data-updated', handleDataUpdate);
    };
  }, [fetchData]);

  const productsByCategory = useMemo(() => {
    const grouped = { Menus: [], Plats: [], Boissons: [], Desserts: [] };
    const sortedProducts = [...products].sort((a, b) => getPrice(a) - getPrice(b));
    sortedProducts.forEach(product => {
      if (grouped[product.category]) {
        grouped[product.category].push(product);
      }
    });
    return grouped;
  }, [products]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingProduct = prevCart.find(item => item._id === product._id);
      if (existingProduct) {
        return prevCart.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prevCart, { ...product, price: getPrice(product), quantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      setCart(prevCart => prevCart.filter(item => item._id !== productId));
      return;
    }
    setCart(prevCart => prevCart.map(item => item._id === productId ? { ...item, quantity: quantity } : item));
  };

  const handleSaveTransaction = async () => {
    if (cart.length === 0) return;
    if (selectedEmployees.length === 0) {
      showNotification("Veuillez sélectionner au moins un employé.", "warning");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/transactions', { cart, employeeIds: selectedEmployees });
      showNotification(data.message, 'success');
      setCart([]);
      setSelectedEmployees([]);
    } catch (err) {
      showNotification(err.response?.data?.message || "Erreur.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const margin = totalAmount - cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {loading && !products.length ? <CircularProgress /> :
            Object.entries(productsByCategory).map(([category, items]) => (
              items.length > 0 && (
                <Box key={category} sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom component="h2">{category}</Typography>
                  <Grid container spacing={2}>
                    {items.map(product => (
                      <Grid item key={product._id} xs={6} sm={4} md={3}>
                        <Card sx={{ height: '100%' }}>
                          <CardActionArea onClick={() => addToCart(product)} sx={{ height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>{product.name}</Typography>
                              <Typography variant="h6" color="primary" sx={{ mt: 1 }}>${getPrice(product).toFixed(2)}</Typography>
                              {product.corporatePrice && product.corporatePrice > 0 && <Typography variant="caption" sx={{ textDecoration: 'line-through' }} color="text.secondary">${product.price.toFixed(2)}</Typography>}
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

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: '20px' }}>
            <Typography variant="h5" gutterBottom>Vente Entreprise</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="employee-select-label">Vendu par</InputLabel>
              <Select
                labelId="employee-select-label"
                multiple
                value={selectedEmployees}
                onChange={e => setSelectedEmployees(e.target.value)}
                input={<OutlinedInput label="Vendu par" />}
                renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {selected.map((value) => (
                        <Chip key={value} label={users.find(u => u._id === value)?.username} size="small" />
                    ))}
                </Box>
                )}
              >
                {users.map(user => (
                  <MenuItem key={user._id} value={user._id}>{user.username}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {cart.length === 0 ? <Typography>La commande est vide.</Typography> : (
              <>
                <List sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                  {cart.map(item => (
                    <ListItem key={item._id} disablePadding sx={{ mb: 1 }}>
                      <ListItemText primary={item.name} />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton size="small" onClick={() => updateCartQuantity(item._id, item.quantity - 1)}><RemoveCircleOutlineIcon fontSize="small" /></IconButton>
                        <TextField
                          size="small" type="number" value={item.quantity}
                          onChange={(e) => updateCartQuantity(item._id, e.target.value)}
                          sx={{
                            width: `${(item.quantity.toString().length * 10) + 30}px`, minWidth: '50px',
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { '-webkit-appearance': 'none', margin: 0 },
                            '& input[type=number]': { '-moz-appearance': 'textfield' },
                          }}
                          inputProps={{ style: { textAlign: 'center' }}}
                        />
                        <IconButton size="small" onClick={() => updateCartQuantity(item._id, item.quantity + 1)}><AddCircleOutlineIcon fontSize="small" /></IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">Total: ${totalAmount.toFixed(2)}</Typography>
                  <Typography variant="body2" color="text.secondary">Marge brute: ${margin.toFixed(2)}</Typography>
                </Box>
                <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} onClick={handleSaveTransaction} disabled={loading || cart.length === 0 || selectedEmployees.length === 0}>
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

export default CorporateSalesPage;