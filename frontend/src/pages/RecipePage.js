import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import { 
  Container, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  Select, 
  MenuItem, 
  TextField, 
  Box, 
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

// Composant d'édition d'un ingrédient
const EditableIngredient = ({ ingredient, index, onUpdate, onDelete, onAdd, isLast }) => {
  const [editedIngredient, setEditedIngredient] = useState({ ...ingredient });

  const handleChange = (field, value) => {
    setEditedIngredient(prev => ({
      ...prev,
      [field]: value.trim()
    }));
  };

  const handleSave = () => {
    onUpdate(index, editedIngredient);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
      <TextField 
        size="small" 
        label="Ingrédient" 
        value={editedIngredient.name || ''} 
        onChange={(e) => handleChange('name', e.target.value)} 
        sx={{ flex: 2 }} 
        required 
      />
      <TextField 
        size="small" 
        label="Qté (x50)" 
        value={editedIngredient.quantity50 || ''} 
        onChange={(e) => handleChange('quantity50', e.target.value)} 
        required 
      />
      <TextField 
        size="small" 
        label="Qté (x100)" 
        value={editedIngredient.quantity100 || ''} 
        onChange={(e) => handleChange('quantity100', e.target.value)} 
        required 
      />
      <Box>
        <IconButton onClick={handleSave} color="primary" size="small">
          <SaveIcon />
        </IconButton>
        <IconButton onClick={() => onDelete(index)} color="error" size="small">
          <DeleteIcon />
        </IconButton>
        {isLast && (
          <Tooltip title="Ajouter un ingrédient">
            <IconButton onClick={onAdd} color="primary" size="small">
              <AddCircleOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

// Formulaire d'ajout (pour les admins)
const AddRecipeForm = ({ products, onRecipeAdded }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity50: '', quantity100: '' }]);

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value.trim();
    setIngredients(newIngredients);
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', quantity50: '', quantity100: '' }]);
  };

  const removeIngredientField = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const handleSubmit = async (e) => {
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
      console.error(err);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 2, mb: 4 }}>
      <Typography variant="h5" gutterBottom>Ajouter une Recette</Typography>
      <Select 
        value={selectedProduct} 
        onChange={e => setSelectedProduct(e.target.value)} 
        displayEmpty 
        fullWidth 
        sx={{ mb: 2 }}
        required
      >
        <MenuItem value="" disabled>Sélectionner un produit</MenuItem>
        {products.map(p => (
          <MenuItem key={p._id} value={p._id}>
            {p.name}
          </MenuItem>
        ))}
      </Select>

      {ingredients.map((ing, index) => (
        <EditableIngredient
          key={index}
          ingredient={ing}
          index={index}
          onUpdate={(idx, updatedIngredient) => {
            const newIngredients = [...ingredients];
            newIngredients[idx] = updatedIngredient;
            setIngredients(newIngredients);
          }}
          onDelete={removeIngredientField}
          onAdd={addIngredientField}
          isLast={index === ingredients.length - 1}
        />
      ))}

      <Button 
        type="submit" 
        variant="contained" 
        color="primary"
        startIcon={<SaveIcon />}
        sx={{ mt: 2 }}
      >
        Enregistrer la recette
      </Button>
    </Paper>
  );
};

function RecipePage() {
  const { user } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editedIngredients, setEditedIngredients] = useState([]);

  const fetchRecipes = async () => {
    try {
      const { data } = await api.get('/recipes');
      setRecipes(data);
    } catch (err) {
      console.error("Erreur de chargement des recettes.");
    }
  };

  useEffect(() => {
    fetchRecipes();
    if (user?.role === 'admin') {
      api.get('/products').then(res => setProducts(res.data));
    }
  }, [user]);

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

  const handleIngredientChange = (recipeId, index, field, value) => {
    const updatedRecipes = recipes.map(recipe => {
      if (recipe._id === recipeId) {
        const updatedIngredients = [...recipe.ingredients];
        updatedIngredients[index] = {
          ...updatedIngredients[index],
          [field]: value.trim()
        };
        return { ...recipe, ingredients: updatedIngredients };
      }
      return recipe;
    });
    setRecipes(updatedRecipes);
  };

  const startEditing = (recipe) => {
    setEditingRecipe(recipe._id);
    setEditedIngredients([...recipe.ingredients]);
  };

  const cancelEditing = () => {
    setEditingRecipe(null);
    setEditedIngredients([]);
  };

  const saveRecipe = async (recipeId) => {
    try {
      const recipeToUpdate = recipes.find(r => r._id === recipeId);
      await api.put(`/recipes/${recipeId}`, {
        ingredients: recipeToUpdate.ingredients
      });
      setEditingRecipe(null);
      fetchRecipes(); // Rafraîchir les données
      alert('Recette mise à jour avec succès !');
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la recette:', err);
      alert('Erreur lors de la mise à jour de la recette');
    }
  };

  const addIngredient = (recipeId) => {
    const updatedRecipes = recipes.map(recipe => {
      if (recipe._id === recipeId) {
        return {
          ...recipe,
          ingredients: [...recipe.ingredients, { name: '', quantity50: '', quantity100: '' }]
        };
      }
      return recipe;
    });
    setRecipes(updatedRecipes);
  };

  const removeIngredient = (recipeId, index) => {
    const updatedRecipes = recipes.map(recipe => {
      if (recipe._id === recipeId) {
        const newIngredients = [...recipe.ingredients];
        newIngredients.splice(index, 1);
        return { ...recipe, ingredients: newIngredients };
      }
      return recipe;
    });
    setRecipes(updatedRecipes);
  };

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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Typography variant="h6">{recipe.productId?.name || 'Produit supprimé'}</Typography>
                    {user?.role === 'admin' && (
                      <Box onClick={(e) => e.stopPropagation()}>
                        {editingRecipe === recipe._id ? (
                          <>
                            <Tooltip title="Annuler">
                              <IconButton onClick={cancelEditing} size="small" color="error" sx={{ mr: 1 }}>
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Enregistrer">
                              <IconButton 
                                onClick={() => saveRecipe(recipe._id)} 
                                size="small" 
                                color="primary"
                                variant="contained"
                              >
                                <SaveIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip title="Modifier la recette">
                            <IconButton 
                              onClick={() => startEditing(recipe)} 
                              size="small" 
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Ingrédient</TableCell>
                          <TableCell>Quantité (x50)</TableCell>
                          <TableCell>Quantité (x100)</TableCell>
                          {user?.role === 'admin' && editingRecipe === recipe._id && <TableCell>Actions</TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recipe.ingredients.map((ing, index) => (
                          <TableRow key={index}>
                            {editingRecipe === recipe._id ? (
                              <>
                                <TableCell>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={ing.name || ''}
                                    onChange={(e) => handleIngredientChange(recipe._id, index, 'name', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={ing.quantity50 || ''}
                                    onChange={(e) => handleIngredientChange(recipe._id, index, 'quantity50', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={ing.quantity100 || ''}
                                    onChange={(e) => handleIngredientChange(recipe._id, index, 'quantity100', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton 
                                    onClick={() => removeIngredient(recipe._id, index)} 
                                    size="small" 
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>{ing.name}</TableCell>
                                <TableCell>{ing.quantity50}</TableCell>
                                <TableCell>{ing.quantity100}</TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                        {editingRecipe === recipe._id && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Button
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={() => addIngredient(recipe._id)}
                                variant="outlined"
                                size="small"
                              >
                                Ajouter un ingrédient
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
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