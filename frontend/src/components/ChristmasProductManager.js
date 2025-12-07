import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

// Imports Material-UI
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, Button, Select, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Box, IconButton, Typography, Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const ChristmasProductManager = () => {
  const { showNotification } = useNotification();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ 
    name: '', 
    category: 'Charcuteries', 
    price: '', 
    cost: '', 
    stock: '',
    description: ''
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Charger les produits du Marché de Noël
  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/christmas-products');
      setProducts(data);
    } catch (err) {
      console.error('Erreur lors du chargement des produits:', err);
      showNotification('Erreur lors du chargement des produits', 'error');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Gestion des changements de formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'cost' || name === 'stock' 
        ? parseFloat(value) || '' 
        : value
    }));
  };

  // Soumission du formulaire d'ajout
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/christmas-products', formData);
      fetchProducts();
      setFormData({ 
        name: '', 
        category: 'Charcuteries', 
        price: '', 
        cost: '', 
        stock: '',
        description: ''
      });
      showNotification('Produit ajouté avec succès', 'success');
    } catch (err) {
      console.error('Erreur lors de l\'ajout du produit:', err);
      showNotification('Erreur lors de l\'ajout du produit', 'error');
    }
  };

  // Ouvrir la modal d'édition
  const handleOpenEditModal = (product) => {
    setEditingProduct({ ...product });
    setIsModalOpen(true);
  };

  // Fermer la modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // Mettre à jour un produit
  const handleUpdateProduct = async () => {
    try {
      await api.put(`/christmas-products/${editingProduct._id}`, editingProduct);
      fetchProducts();
      handleCloseModal();
      showNotification('Produit mis à jour avec succès', 'success');
    } catch (err) {
      console.error('Erreur lors de la mise à jour du produit:', err);
      showNotification('Erreur lors de la mise à jour du produit', 'error');
    }
  };

  // Supprimer un produit
  const handleDeleteProduct = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        await api.delete(`/christmas-products/${id}`);
        fetchProducts();
        showNotification('Produit supprimé avec succès', 'info');
      } catch (err) {
        console.error('Erreur lors de la suppression du produit:', err);
        showNotification('Erreur lors de la suppression du produit', 'error');
      }
    }
  };

  // Gestion des changements dans le formulaire d'édition
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingProduct(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'cost' || name === 'stock' 
        ? parseFloat(value) || '' 
        : value
    }));
  };

  return (
    <Box>
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>Ajouter un produit</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Nom du produit"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Select
              fullWidth
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              size="small"
            >
              <MenuItem value="Charcuteries">Charcuterie</MenuItem>
              <MenuItem value="Fromages">Fromage</MenuItem>
              <MenuItem value="Boissons">Boisson</MenuItem>
              <MenuItem value="Desserts">Dessert</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Prix (€)"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleInputChange}
              required
              size="small"
              inputProps={{ step: '0.01', min: '0' }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Coût (€)"
              name="cost"
              type="number"
              value={formData.cost}
              onChange={handleInputChange}
              size="small"
              inputProps={{ step: '0.01', min: '0' }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Stock"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={handleInputChange}
              required
              size="small"
              inputProps={{ min: '0' }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={2}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary">
              Ajouter le produit
            </Button>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Catégorie</TableCell>
              <TableCell align="right">Prix (€)</TableCell>
              <TableCell align="right">Coût (€)</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell align="right">{product.price?.toFixed(2)} €</TableCell>
                <TableCell align="right">{product.cost?.toFixed(2)} €</TableCell>
                <TableCell align="right">{product.stock}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenEditModal(product)}
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteProduct(product._id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal d'édition */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le produit</DialogTitle>
        <DialogContent>
          {editingProduct && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nom du produit"
                    name="name"
                    value={editingProduct.name}
                    onChange={handleEditInputChange}
                    required
                    size="small"
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Select
                    fullWidth
                    name="category"
                    value={editingProduct.category}
                    onChange={handleEditInputChange}
                    size="small"
                    margin="dense"
                  >
                    <MenuItem value="Charcuteries">Charcuterie</MenuItem>
                    <MenuItem value="Fromages">Fromage</MenuItem>
                    <MenuItem value="Boissons">Boisson</MenuItem>
                    <MenuItem value="Desserts">Dessert</MenuItem>
                  </Select>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Prix (€)"
                    name="price"
                    type="number"
                    value={editingProduct.price}
                    onChange={handleEditInputChange}
                    required
                    size="small"
                    margin="normal"
                    inputProps={{ step: '0.01', min: '0' }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Coût (€)"
                    name="cost"
                    type="number"
                    value={editingProduct.cost}
                    onChange={handleEditInputChange}
                    size="small"
                    margin="normal"
                    inputProps={{ step: '0.01', min: '0' }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Stock"
                    name="stock"
                    type="number"
                    value={editingProduct.stock}
                    onChange={handleEditInputChange}
                    required
                    size="small"
                    margin="normal"
                    inputProps={{ min: '0' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={editingProduct.description || ''}
                    onChange={handleEditInputChange}
                    multiline
                    rows={3}
                    size="small"
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Annuler</Button>
          <Button onClick={handleUpdateProduct} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChristmasProductManager;
