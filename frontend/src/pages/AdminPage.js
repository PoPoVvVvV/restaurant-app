import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Imports depuis Material-UI
import {
  Container, Box, Paper, Typography, Grid, Button, TextField, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Switch, FormControlLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// 1. Gestion de la Semaine
const WeekManager = ({ onWeekChange, currentWeek, viewedWeek }) => {
    const handleNewWeek = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir terminer la semaine ${currentWeek} et commencer une nouvelle semaine ? Les données de la semaine actuelle seront archivées.`)) {
            try {
                const { data } = await api.post('/settings/new-week');
                alert(data.message);
                window.location.reload();
            } catch (err) {
                alert("Erreur lors du changement de semaine.");
            }
        }
    };
    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Gestion de la Semaine</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" type="number" label="Consulter Semaine" value={viewedWeek} onChange={e => onWeekChange(e.target.value ? parseInt(e.target.value, 10) : '')} sx={{ width: '180px' }} />
                <Typography>Actuelle : <strong>{currentWeek}</strong></Typography>
                <Button variant="contained" color="warning" onClick={handleNewWeek}>Clôturer et Commencer Sem. {currentWeek + 1}</Button>
            </Box>
        </Paper>
    );
};

// 2. Gestion du Solde de Compte
const AccountBalanceManager = ({ viewedWeek }) => {
    const [balance, setBalance] = useState(0);
    const [currentBalance, setCurrentBalance] = useState(0);

    const fetchBalance = () => {
        api.get(`/settings/accountBalance_week_${viewedWeek}`)
           .then(res => {
                const bal = res.data.value || 0;
                setBalance(bal);
                setCurrentBalance(bal);
           })
           .catch(() => {
                setBalance(0);
                setCurrentBalance(0);
           });
    };

    useEffect(fetchBalance, [viewedWeek]);

    const handleSave = async () => {
        try {
            await api.post('/settings/account-balance', { balance, week: viewedWeek });
            alert('Solde mis à jour !');
            fetchBalance();
        } catch (err) {
            alert("Erreur lors de la mise à jour.");
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Solde du Compte (Fin de Semaine {viewedWeek})</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography>Enregistré : <strong>${(currentBalance || 0).toFixed(2)}</strong></Typography>
                <TextField size="small" type="number" label="Nouveau solde" value={balance} onChange={e => setBalance(e.target.value)} />
                <Button variant="contained" onClick={handleSave}>Mettre à jour</Button>
            </Box>
        </Paper>
    );
};

// 3. Résumé Financier
const FinancialSummary = ({ viewedWeek }) => {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    setSummary(null);
    api.get(`/reports/financial-summary?week=${viewedWeek}`).then(res => setSummary(res.data)).catch(err => console.error(err));
  }, [viewedWeek]);

  if (!summary) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>;
  
  const liveBalance = (summary.startingBalance || 0) + (summary.netMargin || 0) - (summary.taxPayable || 0);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Résumé Financier (Semaine {viewedWeek})</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4} md={1.5}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography>Chiffre d'Affaires</Typography><Typography variant="h5">${(summary.totalRevenue || 0).toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={4} md={1.5}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography>Coût Marchandises</Typography><Typography variant="h5" color="warning.main">-${(summary.totalCostOfGoods || 0).toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={4} md={1.5}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography>Autres Dépenses</Typography><Typography variant="h5" color="error.main">-${(summary.totalExpenses || 0).toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={4} md={1.5}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography>Total Primes</Typography><Typography variant="h5" color="primary.main">${(summary.totalBonus || 0).toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={4} md={1.5}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography>Déductible d'impôt</Typography><Typography variant="h5" color="info.main">${(summary.taxDeductible || 0).toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={4} md={1.5}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography>Impôt à Payer</Typography><Typography variant="h5" color="error.main">-${(summary.taxPayable || 0).toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={6} md={1.5}><Paper sx={{ p: 2, textAlign: 'center', bgcolor: (summary.netMargin || 0) > 0 ? 'success.light' : 'error.light' }}><Typography>Marge Nette</Typography><Typography variant="h5">${(summary.netMargin || 0).toFixed(2)}</Typography></Paper></Grid>
        <Grid item xs={12} sm={6} md={1.5}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography>Restant Sem. Préc.</Typography><Typography variant="h5" color="secondary.main">${(summary.startingBalance || 0).toFixed(2)}</Typography></Paper></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
            <Typography>Solde Compte en Direct (Estimé)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>${(liveBalance || 0).toFixed(2)}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

// 4. Performance des Employés
const EmployeePerformance = ({ viewedWeek }) => {
  const [report, setReport] = useState([]);
  useEffect(() => {
    api.get(`/reports/employee-performance?week=${viewedWeek}`).then(res => setReport(res.data)).catch(err => console.error(err));
  }, [viewedWeek]);
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Performance des Employés (Semaine {viewedWeek})</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell sx={{ fontWeight: 'bold' }}>Employé</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>Chiffre d'Affaires</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>Marge Générée</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>Prime Estimée</TableCell></TableRow></TableHead>
          <TableBody>{report.map(data => (<TableRow key={data.employeeId}><TableCell>{data.employeeName}</TableCell><TableCell align="right">${data.totalRevenue.toFixed(2)}</TableCell><TableCell align="right" sx={{ color: 'success.main' }}>${data.totalMargin.toFixed(2)}</TableCell><TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold' }}>${data.estimatedBonus.toFixed(2)}</TableCell></TableRow>))}</TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

// 5. Annonce de Livraison
const DeliveryStatusManager = () => {
    const [status, setStatus] = useState({ isActive: false, companyName: '' });
    useEffect(() => { api.get('/settings/delivery-status').then(res => setStatus(res.data.value || { isActive: false, companyName: '' })).catch(() => {}); }, []);
    const handleSave = async () => { try { await api.post('/settings/delivery-status', status); alert('Annonce mise à jour !'); } catch (err) { alert("Erreur."); } };
    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Annonce de Livraison</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" label="Nom du fournisseur(s)" value={status.companyName} onChange={e => setStatus({ ...status, companyName: e.target.value })} sx={{ flexGrow: 1 }} />
                <FormControlLabel control={<Switch checked={status.isActive} onChange={e => setStatus({ ...status, isActive: e.target.checked })} />} label="Afficher" />
                <Button variant="contained" onClick={handleSave}>Enregistrer</Button>
            </Box>
        </Paper>
    );
};

// 6. Paramètres Généraux et Gestion des Employés
const GeneralSettings = () => {
    const [bonusPercentage, setBonusPercentage] = useState(0);
    const [newCode, setNewCode] = useState('');
    const [users, setUsers] = useState([]);
    const fetchUsers = async () => { api.get('/users').then(res => setUsers(res.data)).catch(err => console.error(err)); };
    useEffect(() => {
        api.get('/settings/bonusPercentage').then(res => setBonusPercentage(res.data.value * 100)).catch(() => {});
        fetchUsers();
    }, []);
    const handleSaveBonus = async () => { await api.post('/settings', { key: 'bonusPercentage', value: parseFloat(bonusPercentage) / 100 }); alert('Prime enregistrée !'); };
    const generateInviteCode = async () => { const { data } = await api.post('/users/generate-code'); setNewCode(data.invitationCode); };
    const handleToggleStatus = async (userId) => { try { await api.put(`/users/${userId}/status`); fetchUsers(); } catch (err) { alert("Erreur."); } };
    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Paramètres & Employés</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}><Typography>Prime sur marge :</Typography><TextField size="small" type="number" value={bonusPercentage} onChange={e => setBonusPercentage(e.target.value)} sx={{ width: '80px' }} /><Typography>%</Typography><Button variant="contained" onClick={handleSaveBonus}>Enregistrer</Button></Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}><Button variant="contained" onClick={generateInviteCode}>Générer Code Invitation</Button>{newCode && <Typography fontFamily="monospace" sx={{ p: 1, bgcolor: 'action.hover' }}>{newCode}</Typography>}</Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead><TableRow><TableCell>Nom d'utilisateur</TableCell><TableCell>Rôle</TableCell><TableCell>Statut</TableCell><TableCell align="center">Actions</TableCell></TableRow></TableHead>
                    <TableBody>{users.map(user => (<TableRow key={user._id}><TableCell>{user.username}</TableCell><TableCell>{user.role}</TableCell><TableCell><Chip label={user.isActive ? "Actif" : "Désactivé"} color={user.isActive ? "success" : "error"} size="small" /></TableCell><TableCell align="center"><Button variant="outlined" size="small" onClick={() => handleToggleStatus(user._id)}>{user.isActive ? "Désactiver" : "Activer"}</Button></TableCell></TableRow>))}</TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

// 7. Relevé des Transactions
const TransactionLog = ({ viewedWeek }) => {
  const [transactions, setTransactions] = useState([]);
  useEffect(() => { api.get(`/transactions?week=${viewedWeek}`).then(res => setTransactions(res.data)).catch(err => console.error(err)); }, [viewedWeek]);
  const handleExport = async () => { /* ... */ };
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography variant="h5">Relevé des Transactions</Typography><Button variant="outlined" onClick={handleExport}>Exporter en CSV</Button></Box>
      <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Employé</TableCell><TableCell align="right">Montant</TableCell><TableCell align="right">Marge</TableCell></TableRow></TableHead><TableBody>{transactions.map(t => (<TableRow key={t._id}><TableCell>{new Date(t.createdAt).toLocaleString('fr-FR')}</TableCell><TableCell>{t.employeeId?.username || 'N/A'}</TableCell><TableCell align="right">${t.totalAmount.toFixed(2)}</TableCell><TableCell align="right">${t.margin.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table></TableContainer>
    </Paper>
  );
};

// 8. Gestion des Dépenses
const ExpenseManager = ({ viewedWeek }) => {
    const [expenses, setExpenses] = useState([]);
    const [formData, setFormData] = useState({ amount: '', category: 'Matières Premières', description: '' });
    const fetchExpenses = () => { api.get(`/expenses?week=${viewedWeek}`).then(res => setExpenses(res.data)).catch(err => console.error(err)); };
    useEffect(fetchExpenses, [viewedWeek]);
    const onSubmit = async e => { e.preventDefault(); try { await api.post('/expenses', { ...formData, amount: parseFloat(formData.amount) }); fetchExpenses(); setFormData({ amount: '', category: 'Matières Premières', description: '' }); } catch (err) { alert("Erreur."); } };
    const handleDelete = async (id) => { if(window.confirm('Sûr ?')) { try { await api.delete(`/expenses/${id}`); fetchExpenses(); } catch(err) { alert('Erreur.'); } } };
    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Gestion des Dépenses</Typography>
            <Box component="form" onSubmit={onSubmit} sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}><TextField size="small" type="number" name="amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} label="Montant ($)" required /><Select size="small" name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><MenuItem value="Matières Premières">Matières Premières</MenuItem><MenuItem value="Frais Véhicule">Frais Véhicule</MenuItem><MenuItem value="Frais Avocat">Frais Avocat</MenuItem></Select><TextField size="small" name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} label="Description" sx={{ flexGrow: 1 }} /><Button type="submit" variant="contained">Ajouter</Button></Box>
            <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Catégorie</TableCell><TableCell>Description</TableCell><TableCell align="right">Montant</TableCell><TableCell align="center">Actions</TableCell></TableRow></TableHead><TableBody>{expenses.map(exp => (<TableRow key={exp._id}><TableCell>{new Date(exp.date).toLocaleDateString('fr-FR')}</TableCell><TableCell>{exp.category}</TableCell><TableCell>{exp.description}</TableCell><TableCell align="right" sx={{ color: 'error.main' }}>-${exp.amount.toFixed(2)}</TableCell><TableCell align="center"><IconButton onClick={() => handleDelete(exp._id)} color="error" size="small"><DeleteIcon /></IconButton></TableCell></TableRow>))}</TableBody></Table></TableContainer>
        </Paper>
    );
};

// 9. Gestion des Produits
const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', category: 'Plats', price: 0, corporatePrice: '', cost: 0, stock: 0 });
  const fetchProducts = async () => { try { const { data } = await api.get('/products'); setProducts(data); } catch (err) { console.error(err); } };
  useEffect(() => { fetchProducts(); }, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const handleOpenModal = (product) => { setEditingProduct(product); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); };
  const handleSaveChanges = async () => { try { await api.put(`/products/${editingProduct._id}`, editingProduct); fetchProducts(); handleCloseModal(); } catch (err) { alert("Erreur."); } };
  
  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  const onSubmit = async e => { e.preventDefault(); try { await api.post('/products', formData); fetchProducts(); setFormData({ name: '', category: 'Plats', price: 0, corporatePrice: '', cost: 0, stock: 0 }); } catch (err) { alert("Erreur."); } };
  const onDelete = async (id) => { if (window.confirm('Sûr ?')) { try { await api.delete(`/products/${id}`); fetchProducts(); } catch (err) { console.error(err); } } };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Gestion des Produits</Typography>
      <Box component="form" onSubmit={onSubmit} sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField size="small" name="name" value={formData.name} onChange={onChange} label="Nom produit" required />
          <Select size="small" name="category" value={formData.category} onChange={onChange}><MenuItem value="Plats">Plat</MenuItem><MenuItem value="Boissons">Boisson</MenuItem><MenuItem value="Desserts">Dessert</MenuItem><MenuItem value="Menus">Menu</MenuItem></Select>
          <TextField size="small" type="number" name="price" value={formData.price} onChange={onChange} label="Prix ($)" />
          <TextField size="small" type="number" name="corporatePrice" value={formData.corporatePrice} onChange={onChange} label="Prix Ent. ($)" />
          <TextField size="small" type="number" name="cost" value={formData.cost} onChange={onChange} label="Coût ($)" />
          <TextField size="small" type="number" name="stock" value={formData.stock} onChange={onChange} label="Stock" />
          <Button type="submit" variant="contained">Ajouter</Button>
      </Box>
      <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Nom</TableCell><TableCell>Catégorie</TableCell><TableCell align="right">Prix</TableCell><TableCell align="right">Prix Ent.</TableCell><TableCell align="right">Coût</TableCell><TableCell align="right">Stock</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{products.map(p => (<TableRow key={p._id}><TableCell>{p.name}</TableCell><TableCell>{p.category}</TableCell><TableCell align="right">${p.price.toFixed(2)}</TableCell><TableCell align="right">${(p.corporatePrice || 0).toFixed(2)}</TableCell><TableCell align="right">${p.cost.toFixed(2)}</TableCell><TableCell align="right">{p.stock}</TableCell><TableCell align="right"><Button size="small" onClick={() => handleOpenModal(p)}>Modifier</Button><Button size="small" color="error" onClick={() => onDelete(p._id)}>Supprimer</Button></TableCell></TableRow>))}</TableBody></Table></TableContainer>

      <Dialog open={isModalOpen} onClose={handleCloseModal}><DialogTitle>Modifier le Produit</DialogTitle><DialogContent><Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>{editingProduct && <>
          <TextField label="Nom" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
          <TextField label="Prix Vente ($)" type="number" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} />
          <TextField label="Prix Entreprise ($)" type="number" value={editingProduct.corporatePrice} onChange={e => setEditingProduct({ ...editingProduct, corporatePrice: e.target.value })} />
          <TextField label="Coût ($)" type="number" value={editingProduct.cost} onChange={e => setEditingProduct({ ...editingProduct, cost: e.target.value })} />
      </>} </Box></DialogContent><DialogActions><Button onClick={handleCloseModal}>Annuler</Button><Button onClick={handleSaveChanges} variant="contained">Sauvegarder</Button></DialogActions></Dialog>
    </Paper>
  );
};

// --- COMPOSANT PRINCIPAL DE LA PAGE ---
function AdminPage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [viewedWeek, setViewedWeek] = useState(1);
  useEffect(() => {
    api.get('/settings/currentWeekId').then(res => {
      const week = res.data.value || 1;
      setCurrentWeek(week);
      setViewedWeek(week);
    }).catch(() => {});
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>Panneau Administrateur</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}><WeekManager onWeekChange={setViewedWeek} currentWeek={currentWeek} viewedWeek={viewedWeek} /></Grid>
        <Grid item xs={12}><AccountBalanceManager viewedWeek={viewedWeek} /></Grid>
        <Grid item xs={12}><FinancialSummary viewedWeek={viewedWeek} /></Grid>
        <Grid item xs={12}><EmployeePerformance viewedWeek={viewedWeek} /></Grid>
        <Grid item xs={12}><DeliveryStatusManager /></Grid>
        <Grid item xs={12}><GeneralSettings /></Grid>
        <Grid item xs={12}><TransactionLog viewedWeek={viewedWeek} /></Grid>
        <Grid item xs={12}><ExpenseManager viewedWeek={viewedWeek} /></Grid>
        <Grid item xs={12}><ProductManager /></Grid>
      </Grid>
    </Container>
  );
}

export default AdminPage;