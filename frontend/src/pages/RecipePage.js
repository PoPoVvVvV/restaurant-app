import React, { useState, useEffect, useContext, useMemo, useCallback, memo } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { Container, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Select, MenuItem, TextField, Box, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

// Formulaire d'ajout (pour les admins)
const AddRecipeForm = memo(({ products, onRecipeAdded }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity50: '', quantity100: '' }]);

  const handleIngredientChange = useCallback((index, field, value) => {
    setIngredients(prev => {
      const newIngredients = [...prev];
      newIngredients[index][field] = value;
      return newIngredients;
    });
  }, []);

  const addIngredientField = useCallback(() => {
    setIngredients(prev => [...prev, { name: '', quantity50: '', quantity100: '' }]);
  }, []);

  const removeIngredientField = useCallback((index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('Veuillez sélectionner un produit.');
      return;
    }
    try {
      await api.post('/recipes', { productId: selectedProduct, ingredients });
      alert('Recette ajoutée/mise à jour avec succès !');
      onRecipeAdded();
      setSelectedProduct('');
      setIngredients([{ name: '', quantity50: '', quantity100: '' }]);
    } catch (err) {
      alert('Erreur lors de l\'ajout de la recette.');
    }
  }, [selectedProduct, ingredients, onRecipeAdded]);

  return (
    <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 2, mb: 4 }}>
      <Typography variant="h5" gutterBottom>Ajouter / Modifier une Recette</Typography>
      <Select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} displayEmpty fullWidth sx={{ mb: 2 }}>
        <MenuItem value="" disabled>Sélectionner un produit</MenuItem>
        {products.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
      </Select>

      {ingredients.map((ing, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField size="small" label="Ingrédient" value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} sx={{ flex: 2 }} required />
          <TextField size="small" label="Qté (x50)" value={ing.quantity50} onChange={e => handleIngredientChange(index, 'quantity50', e.target.value)} required />
          <TextField size="small" label="Qté (x100)" value={ing.quantity100} onChange={e => handleIngredientChange(index, 'quantity100', e.target.value)} required />
          <IconButton onClick={() => removeIngredientField(index)} color="error"><DeleteIcon /></IconButton>
        </Box>
      ))}

      <Button startIcon={<AddCircleOutlineIcon />} onClick={addIngredientField} sx={{ mr: 2 }}>Ingrédient</Button>
      <Button type="submit" variant="contained">Enregistrer</Button>
    </Paper>
  );
});

AddRecipeForm.displayName = 'AddRecipeForm';

function RecipePage() {
  const { user } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);

  const fetchRecipes = useCallback(async () => {
    try {
      const { data } = await api.get('/recipes');
      setRecipes(data);
    } catch (err) {
      console.error("Erreur de chargement des recettes.");
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
    if (user?.role === 'admin') {
      api.get('/products').then(res => setProducts(res.data));
    }
  }, [user, fetchRecipes]);

  const recipesByCategory = useMemo(() => {
  const grouped = { Menus: [], Plats: [], Boissons: [], Desserts: [], Partenariat: [] };
    recipes.forEach(recipe => {
      const category = recipe.productId?.category;
      if (category && grouped[category]) {
        grouped[category].push(recipe);
      }
    });
    return grouped;
  }, [recipes]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Livre des Recettes
      </Typography>

      {user?.role === 'admin' && <AddRecipeForm products={products} onRecipeAdded={fetchRecipes} />}

      {Object.entries(recipesByCategory).map(([category, categoryRecipes]) => (
        categoryRecipes.length > 0 && (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom component="h2" sx={{ mt: 2 }}>
              {category}
            </Typography>
            {categoryRecipes.map(recipe => (
              <Accordion key={recipe._id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{recipe.productId?.name || 'Produit supprimé'}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow><TableCell>Ingrédient</TableCell><TableCell>Quantité (x50)</TableCell><TableCell>Quantité (x100)</TableCell></TableRow>
                      </TableHead>
                      <TableBody>
                        {recipe.ingredients.map((ing, index) => (
                          <TableRow key={index}>
                            <TableCell>{ing.name}</TableCell>
                            <TableCell>{ing.quantity50}</TableCell>
                            <TableCell>{ing.quantity100}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )
      ))}
    </Container>
  );
}

export default RecipePage;