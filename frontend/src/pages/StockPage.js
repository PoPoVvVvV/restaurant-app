import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

// Imports depuis Material-UI
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  Chip,
  TextField,
  Button,
  Alert,
  AlertTitle
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function StockPage() {
  const [products, setProducts] = useState([]);
  const [deliveryStatus, setDeliveryStatus] = useState({ isActive: false, companyName: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const LOW_STOCK_THRESHOLD = 100;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, statusRes] = await Promise.all([
          api.get('/products'),
          api.get('/settings/delivery-status')
        ]);
        
        const categoryOrder = ["Menus", "Plats", "Boissons", "Desserts"];
        const sortedProducts = productsRes.data.sort((a, b) => {
          const indexA = categoryOrder.indexOf(a.category);
          const indexB = categoryOrder.indexOf(b.category);
          return indexA - indexB;
        });
        
        const productsWithEdit = sortedProducts.map(p => ({ ...p, editedStock: p.stock }));
        setProducts(productsWithEdit);
        setDeliveryStatus(statusRes.data.value);

      } catch (err) {
        setError('Impossible de charger les données.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p._id === productId ? { ...p, stock: parseInt(newStock, 10) } : p
        )
      );
      showNotification(`${product.name} mis à jour !`, 'success');
    } catch (err) {
      showNotification("Erreur lors de la mise à jour du stock.", 'error');
    }
  };

  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" align="center">{error}</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {deliveryStatus.isActive && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Information</AlertTitle>
          Une commande de matière première est en route via l'entreprise : <strong>{deliveryStatus.companyName}</strong>
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestion des Stocks
        </Typography>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6">
            Valeur Totale du Stock : ${totalStockValue.toFixed(2)}
          </Typography>
        </Paper>
      </Box>

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
                      type="number"
                      size="small"
                      value={product.editedStock}
                      onChange={(e) => handleStockChange(product._id, e.target.value)}
                      sx={{ width: '100px' }}
                      inputProps={{ min: 0 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSaveStock(product._id)}
                      startIcon={<CheckCircleIcon />}
                    >
                      Valider
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default StockPage;