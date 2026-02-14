import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useNotification } from '../context/NotificationContext';
import UserManager from '../components/UserManager';
import AdminNotificationsManager from '../components/AdminNotificationsManager';

// Imports depuis Material-UI
import {
  Container, Box, Paper, Typography, Grid, Button, TextField, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Switch, FormControlLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

// --- SOUS-COMPOSANTS DE LA PAGE ADMIN ---

// 1. Gestion de la Semaine
const WeekManager = ({ onWeekChange, currentWeek, viewedWeek }) => {
    const { showNotification, confirm } = useNotification();
    const handleNewWeek = async () => {
        const shouldProceed = await confirm(
            `Êtes-vous sûr de vouloir terminer la semaine ${currentWeek} et commencer une nouvelle semaine ?`,
            {
                title: 'Confirmer le changement de semaine',
                severity: 'warning',
                confirmText: 'Confirmer',
                cancelText: 'Annuler'
            }
        );
        if (shouldProceed) {
            try {
                const { data } = await api.post('/settings/new-week');
                showNotification(data.message, 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                showNotification("Erreur lors du changement de semaine.", "error");
            }
        }
    };
    return (
        <Paper elevation={3} sx={{ p: 2 }}>
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
    const { showNotification } = useNotification();
    const [balance, setBalance] = useState(0);
    const [currentBalance, setCurrentBalance] = useState(0);

    const fetchBalance = () => {
        api.get(`/settings/accountBalance_week_${viewedWeek}`)
           .then(res => {
                const bal = res.data.value || 0;
                setBalance(bal);
                setCurrentBalance(bal);
           })
           .catch(() => { setBalance(0); setCurrentBalance(0); });
    };

    useEffect(fetchBalance, [viewedWeek]);

    const handleSave = async () => {
        try {
            await api.post('/settings/account-balance', { balance, week: viewedWeek });
            showNotification('Solde mis à jour !', 'success');
            fetchBalance();
        } catch (err) {
            showNotification("Erreur lors de la mise à jour.", "error");
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

// 3. Graphique des Ventes Hebdomadaires
const WeeklySalesChart = ({ viewedWeek }) => {
  const [chartData, setChartData] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    api.get(`/reports/weekly-sales-summary?week=${viewedWeek}`)
       .then(res => {
         setChartData(res.data.chartData);
         setEmployees(res.data.employees);
       })
       .catch(err => console.error(err));
  }, [viewedWeek]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

  return (
    <Paper elevation={3} sx={{ p: 2, height: '400px' }}>
      <Typography variant="h5" gutterBottom>Ventes de la Semaine par Employé</Typography>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
          <Legend />
          {employees.map((employeeName, index) => (
            <Bar
              key={employeeName}
              dataKey={employeeName}
              stackId="a"
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

// 3.1. Graphique des Ventes par Menu
const MenuSalesChart = ({ viewedWeek }) => {
  const [menuData, setMenuData] = useState([]);
  const [totalMenusSold, setTotalMenusSold] = useState(0);

  useEffect(() => {
    api.get(`/reports/menu-sales?week=${viewedWeek}`)
       .then(res => {
         setMenuData(res.data);
         // Calculer le total de quantités de menus vendus
         const total = res.data.reduce((sum, menu) => sum + menu.quantity, 0);
         setTotalMenusSold(total);
       })
       .catch(err => console.error(err));
  }, [viewedWeek]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#00D4AA', '#FF6B6B'];

  return (
    <Paper elevation={3} sx={{ p: 2, height: '450px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom>Menus les Plus Vendus (Semaine {viewedWeek})</Typography>
        <Box sx={{ 
          bgcolor: 'primary.main', 
          color: 'white', 
          px: 2, 
          py: 1, 
          borderRadius: 2,
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Total: {totalMenusSold} menus vendus
          </Typography>
        </Box>
      </Box>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={menuData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="menuName" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'count') return [`${value} fois`, 'Nombre de ventes'];
              if (name === 'quantity') return [`${value} unités`, 'Quantité vendue'];
              if (name === 'revenue') return [`$${Number(value).toFixed(2)}`, 'Chiffre d\'affaires'];
              if (name === 'margin') return [`$${Number(value).toFixed(2)}`, 'Marge'];
              return [value, name];
            }}
            labelFormatter={(label) => `Menu: ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="quantity" 
            fill={COLORS[0]} 
            name="Quantité vendue"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

// 4. Résumé Financier
const FinancialSummary = ({ viewedWeek }) => {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    setSummary(null);
    api.get(`/reports/financial-summary?week=${viewedWeek}`).then(res => setSummary(res.data)).catch(err => console.error(err));
  }, [viewedWeek]);

  if (!summary) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>;
  
  // Calculer les dépenses par catégorie
  const matieresPremieres = summary.expensesBreakdown?.['Matières Premières'] || 0;
  const fraisVehicule = summary.expensesBreakdown?.['Frais Véhicule'] || 0;
  const fraisAvocat = summary.expensesBreakdown?.['Frais Avocat'] || 0;
  const fraisNourriture = summary.expensesBreakdown?.['Frais Nourriture'] || 0;
  const donVerse = summary.expensesBreakdown?.['Don versé'] || 0;
  const location = summary.expensesBreakdown?.['Location'] || 0;

  // Calculer les autres entrées (Prestation Extérieur + Dons)
  const prestationExterieur = summary.expensesBreakdown?.['Prestation Extérieur'] || 0;
  const dons = summary.expensesBreakdown?.['Dons'] || 0;
  const totalAutresEntrees = prestationExterieur + dons;

  // Le total des primes est maintenant calculé correctement dans l'API avec les plafonds
  const totalBonus = summary.totalBonus || 0;
  
  const deductibleImpots = matieresPremieres + fraisVehicule + fraisNourriture + fraisAvocat + location + donVerse;

  // Calculer l'impôt à payer
  const totalRevenus = (summary.totalRevenue || 0) + totalAutresEntrees + dons;
  const totalDeductible = matieresPremieres + fraisVehicule + fraisAvocat + fraisNourriture + donVerse + location + totalBonus;
  const resultatImposable = totalRevenus - totalDeductible;

  // Calculer l'impôt selon les tranches
  let impotAPayer = 0;
  if (totalRevenus > 10000) {
    if (totalRevenus <= 50000) {
      impotAPayer = resultatImposable * 0.10;
    } else if (totalRevenus <= 100000) {
      impotAPayer = resultatImposable * 0.19;
    } else if (totalRevenus <= 250000) {
      impotAPayer = resultatImposable * 0.28;
    } else if (totalRevenus <= 500000) {
      impotAPayer = resultatImposable * 0.36;
    } else {
      impotAPayer = resultatImposable * 0.46;
    }
  }
  // S'assurer que l'impôt n'est pas négatif
  impotAPayer = Math.max(0, impotAPayer);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      {/* Première ligne - Revenus et calculs fiscaux */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Chiffre d'Affaires</Typography>
            <Typography variant="h5">${(summary.totalRevenue || 0).toFixed(2)}</Typography>
            <Typography variant="caption" color="text.secondary">Entreprise & Particulier</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Autres Entrées</Typography>
            <Typography variant="h5" color="success.main">+${totalAutresEntrees.toFixed(2)}</Typography>
            <Typography variant="caption" color="text.secondary">Prestation Extérieur & Dons</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Total Primes</Typography>
            <Typography variant="h5" color="primary.main">${totalBonus.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Déductible d'impôt</Typography>
            <Typography variant="h5" color="info.main">${deductibleImpots.toFixed(2)}</Typography>
            <Typography variant="caption" color="text.secondary">Dépenses déductibles</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Impôt à payer</Typography>
            <Typography variant="h5" color="error.main">-${impotAPayer.toFixed(2)}</Typography>
            <Typography variant="caption" color="text.secondary">Calcul progressif</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Deuxième ligne - Dépenses détaillées */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Matières Premières</Typography>
            <Typography variant="h6" color="warning.main">-${matieresPremieres.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Frais Véhicule</Typography>
            <Typography variant="h6" color="warning.main">-${fraisVehicule.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Frais Avocat</Typography>
            <Typography variant="h6" color="warning.main">-${fraisAvocat.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Frais Nourriture</Typography>
            <Typography variant="h6" color="warning.main">-${fraisNourriture.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Don Versé</Typography>
            <Typography variant="h6" color="warning.main">-${donVerse.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Location</Typography>
            <Typography variant="h6" color="warning.main">-${location.toFixed(2)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Troisième ligne - Solde */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: 'grey.900',
            color: 'white'
          }}>
            <Typography sx={{ color: 'white' }}>Solde Compte en Direct</Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold',
                color: 'white'
              }}
            >
              ${(summary.liveBalance || 0).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

// 5. Performance des Employés
const EmployeePerformance = ({ viewedWeek }) => {
  const [report, setReport] = useState([]);
  useEffect(() => { api.get(`/reports/employee-performance?week=${viewedWeek}`).then(res => setReport(res.data)); }, [viewedWeek]);
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small"><TableHead><TableRow><TableCell>Employé</TableCell><TableCell align="right">CA</TableCell><TableCell align="right">Marge</TableCell><TableCell align="right">Prime</TableCell></TableRow></TableHead><TableBody>{report.map(data => (<TableRow key={data.employeeId}><TableCell>{data.employeeName}</TableCell><TableCell align="right">${data.totalRevenue.toFixed(2)}</TableCell><TableCell align="right">${data.totalMargin.toFixed(2)}</TableCell><TableCell align="right">${data.estimatedBonus.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table>
    </TableContainer>
  );
};

// (Ancien réglage global de prime supprimé : tout est défini par utilisateur)

// 7. Relevé des Transactions
const TransactionLog = ({ viewedWeek }) => {
  const { showNotification, confirm } = useNotification();
  const [transactions, setTransactions] = useState([]);
  useEffect(() => { 
    api.get(`/transactions?week=${viewedWeek}`).then(res => {
      // Gérer la nouvelle structure paginée ou l'ancienne structure
      setTransactions(res.data.transactions || res.data);
    }); 
  }, [viewedWeek]);
  
  const transactionsByDay = useMemo(() => {
    const grouped = {};
    transactions.forEach(t => {
      const date = new Date(t.createdAt).toLocaleDateString('fr-FR');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(t);
    });
    return grouped;
  }, [transactions]);

  const handleExport = async () => { try { const response = await api.get(`/reports/transactions/export?week=${viewedWeek}`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `transactions-semaine-${viewedWeek}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch (err) { showNotification("Impossible d'exporter.", 'error'); } };
  const handleDelete = async (id) => {
    const shouldDelete = await confirm(
      'Êtes-vous sûr de vouloir supprimer cette transaction ?',
      {
        title: 'Confirmer la suppression',
        severity: 'error',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
      }
    );
    if (shouldDelete) {
      try {
        await api.delete(`/transactions/${id}`);
        showNotification("Transaction supprimée.", "info");
      } catch(err) {
        showNotification('Erreur.', 'error');
      }
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography variant="h5">Relevé des Transactions</Typography><Button variant="outlined" onClick={handleExport}>Exporter en CSV</Button></Box>
      {Object.entries(transactionsByDay).map(([date, dailyTransactions]) => (
        <Box key={date} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ bgcolor: 'action.hover', p: 1 }}>{date}</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead><TableRow><TableCell>Heure</TableCell><TableCell>Employé</TableCell><TableCell align="right">Montant</TableCell><TableCell align="right">Marge</TableCell><TableCell align="center">Actions</TableCell></TableRow></TableHead>
              <TableBody>{dailyTransactions.map(t => (<TableRow key={t._id}><TableCell>{new Date(t.createdAt).toLocaleTimeString('fr-FR')}</TableCell><TableCell>{t.employeeId?.username || 'N/A'}</TableCell><TableCell align="right">${t.totalAmount.toFixed(2)}</TableCell><TableCell align="right">${t.margin.toFixed(2)}</TableCell><TableCell align="center"><IconButton onClick={() => handleDelete(t._id)} color="error" size="small"><DeleteIcon /></IconButton></TableCell></TableRow>))}</TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Paper>
  );
};

// 8. Gestion des Entrées / Sorties
const IncomeExpenseManager = ({ viewedWeek }) => {
    const { showNotification, confirm } = useNotification();
    const [expenses, setExpenses] = useState([]);
    const [formData, setFormData] = useState({ 
        amount: '', 
        type: 'Sorties', 
        category: 'Matières Premières', 
        description: '' 
    });

    const fetchExpenses = () => { 
        api.get(`/expenses?week=${viewedWeek}`).then(res => setExpenses(res.data)); 
    };
    
    useEffect(fetchExpenses, [viewedWeek]);

    // Catégories selon le type sélectionné
    const getCategories = (type) => {
        if (type === 'Entrées') {
            return [
                { value: 'Prestation Extérieur', label: 'Prestation Extérieur' },
                { value: 'Dons', label: 'Dons' }
            ];
        } else {
            return [
                { value: 'Matières Premières', label: 'Matières Premières' },
                { value: 'Frais Véhicule', label: 'Frais Véhicule' },
                { value: 'Frais Nourriture', label: 'Frais Nourriture' },
                { value: 'Frais Avocat', label: 'Frais Avocat' },
                { value: 'Don versé', label: 'Don versé' },
                { value: 'Location', label: 'Location' }
            ];
        }
    };

    const handleTypeChange = (newType) => {
        const categories = getCategories(newType);
        setFormData({
            ...formData,
            type: newType,
            category: categories[0].value
        });
    };

    const onSubmit = async e => { 
        e.preventDefault(); 
        try { 
            await api.post('/expenses', { 
                ...formData, 
                amount: parseFloat(formData.amount),
                type: formData.type
            }); 
            fetchExpenses(); 
            setFormData({ 
                amount: '', 
                type: 'Sorties', 
                category: 'Matières Premières', 
                description: '' 
            }); 
            showNotification(`${formData.type === 'Entrées' ? 'Entrée' : 'Sortie'} ajoutée.`, "success"); 
        } catch (err) { 
            showNotification("Erreur.", "error"); 
        } 
    };

    const handleDelete = async (id) => {
        const shouldDelete = await confirm(
            'Êtes-vous sûr de vouloir supprimer cette entrée/sortie ?',
            {
                title: 'Confirmer la suppression',
                severity: 'error',
                confirmText: 'Supprimer',
                cancelText: 'Annuler'
            }
        );
        if (shouldDelete) {
            try {
                await api.delete(`/expenses/${id}`);
                fetchExpenses();
                showNotification("Entrée/Sortie supprimée.", "info");
            } catch(err) {
                showNotification('Erreur.', 'error');
            }
        }
    };

    return (
        <TableContainer component={Paper} variant="outlined">
            <Box component="form" onSubmit={onSubmit} sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField 
                    size="small" 
                    type="number" 
                    name="amount" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    label="Montant ($)" 
                    required 
                />
                <Select 
                    size="small" 
                    name="type" 
                    value={formData.type} 
                    onChange={e => handleTypeChange(e.target.value)}
                    sx={{ minWidth: 120 }}
                >
                    <MenuItem value="Entrées">Entrées</MenuItem>
                    <MenuItem value="Sorties">Sorties</MenuItem>
                </Select>
                <Select 
                    size="small" 
                    name="category" 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    sx={{ minWidth: 180 }}
                >
                    {getCategories(formData.type).map(cat => (
                        <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                    ))}
                </Select>
                <TextField 
                    size="small" 
                    name="description" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    label="Description" 
                    sx={{ flexGrow: 1, minWidth: 200 }} 
                />
                <Button type="submit" variant="contained">Ajouter</Button>
            </Box>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Catégorie</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Montant</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {expenses.map(exp => (
                        <TableRow key={exp._id}>
                            <TableCell>{new Date(exp.date).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={exp.type || 'Sorties'} 
                                    color={exp.type === 'Entrées' ? 'success' : 'error'} 
                                    size="small" 
                                />
                            </TableCell>
                            <TableCell>{exp.category}</TableCell>
                            <TableCell>{exp.description}</TableCell>
                            <TableCell 
                                align="right" 
                                sx={{ 
                                    color: exp.type === 'Entrées' ? 'success.main' : 'error.main',
                                    fontWeight: 'bold'
                                }}
                            >
                                {exp.type === 'Entrées' ? '+' : '-'}${exp.amount.toFixed(2)}
                            </TableCell>
                            <TableCell align="center">
                                <IconButton onClick={() => handleDelete(exp._id)} color="error" size="small">
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

// 9. Gestion des Produits
const ProductManager = () => {
  const { showNotification, confirm } = useNotification();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', category: 'Plats', price: '', corporatePrice: '', cost: '', stock: '' });
  const fetchProducts = async () => { try { const { data } = await api.get('/products'); setProducts(data); } catch (err) { console.error(err); } };
  useEffect(() => { fetchProducts(); }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const handleOpenModal = (product) => { setEditingProduct({ ...product }); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); };
  const handleSaveChanges = async () => { try { await api.put(`/products/${editingProduct._id}`, editingProduct); fetchProducts(); handleCloseModal(); showNotification("Produit mis à jour.", "success"); } catch (err) { showNotification("Erreur.", "error"); } };
  const onSubmit = async e => { e.preventDefault(); try { await api.post('/products', formData); fetchProducts(); setFormData({ name: '', category: 'Plats', price: '', corporatePrice: '', cost: '', stock: '' }); showNotification("Produit ajouté.", "success"); } catch (err) { showNotification("Erreur.", "error"); } };
  const onDelete = async (id) => {
    const shouldDelete = await confirm(
      'Êtes-vous sûr de vouloir supprimer ce produit ?',
      {
        title: 'Confirmer la suppression',
        severity: 'error',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
      }
    );
    if (shouldDelete) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
        showNotification("Produit supprimé.", "info");
      } catch (err) {
        showNotification("Erreur.", "error");
      }
    }
  };
  return (
    <TableContainer component={Paper} variant="outlined">
      <Box component="form" onSubmit={onSubmit} sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}><TextField size="small" name="name" value={formData.name} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })} label="Nom produit" required /><Select size="small" name="category" value={formData.category} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })}><MenuItem value="Plats">Plat</MenuItem><MenuItem value="Boissons">Boisson</MenuItem><MenuItem value="Desserts">Dessert</MenuItem><MenuItem value="Menus">Menu</MenuItem><MenuItem value="Partenariat">Partenariat</MenuItem></Select><TextField size="small" type="number" name="price" value={formData.price} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })} label="Prix ($)" /><TextField size="small" type="number" name="corporatePrice" value={formData.corporatePrice} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })} label="Prix Ent. ($)" /><TextField size="small" type="number" name="cost" value={formData.cost} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })} label="Coût ($)" /><TextField size="small" type="number" name="stock" value={formData.stock} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })} label="Stock" /><Button type="submit" variant="contained">Ajouter</Button></Box>
      <Table size="small"><TableHead><TableRow><TableCell>Nom</TableCell><TableCell>Catégorie</TableCell><TableCell align="right">Prix</TableCell><TableCell align="right">Prix Ent.</TableCell><TableCell align="right">Coût</TableCell><TableCell align="right">Stock</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{products.map(p => (<TableRow key={p._id}><TableCell>{p.name}</TableCell><TableCell>{p.category}</TableCell><TableCell align="right">${p.price.toFixed(2)}</TableCell><TableCell align="right">${(p.corporatePrice || 0).toFixed(2)}</TableCell><TableCell align="right">${p.cost.toFixed(2)}</TableCell><TableCell align="right">{p.stock}</TableCell><TableCell align="right"><Button size="small" onClick={() => handleOpenModal(p)}>Modifier</Button><Button size="small" color="error" onClick={() => onDelete(p._id)}>Supprimer</Button></TableCell></TableRow>))}</TableBody></Table>
      <Dialog open={isModalOpen} onClose={handleCloseModal}><DialogTitle>Modifier le Produit</DialogTitle><DialogContent><Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>{editingProduct && <>
          <TextField margin="dense" label="Nom" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
          <TextField margin="dense" label="Prix Vente ($)" type="number" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} />
          <TextField margin="dense" label="Prix Entreprise ($)" type="number" value={editingProduct.corporatePrice} onChange={e => setEditingProduct({ ...editingProduct, corporatePrice: e.target.value })} />
          <TextField margin="dense" label="Coût ($)" type="number" value={editingProduct.cost} onChange={e => setEditingProduct({ ...editingProduct, cost: e.target.value })} />
      </>} </Box></DialogContent><DialogActions><Button onClick={handleCloseModal}>Annuler</Button><Button onClick={handleSaveChanges} variant="contained">Sauvegarder</Button></DialogActions></Dialog>
    </TableContainer>
  );
};

// 10. Annonce de Livraison
const DeliveryStatusManager = () => {
    const { showNotification } = useNotification();
    const [status, setStatus] = useState({ isActive: false, companyName: '', expectedReceipts: [] });
    const [ingredients, setIngredients] = useState([]);

    useEffect(() => {
        Promise.all([
            api.get('/settings/delivery-status'),
            api.get('/ingredients')
        ]).then(([deliveryRes, ingredientsRes]) => {
            const value = deliveryRes.data.value || { isActive: false, companyName: '', expectedReceipts: [] };
            setStatus({ isActive: !!value.isActive, companyName: value.companyName || '', expectedReceipts: Array.isArray(value.expectedReceipts) ? value.expectedReceipts : [] });
            setIngredients(ingredientsRes.data || []);
        }).catch(() => {});
    }, []);

    const addReceiptRow = () => {
        setStatus(s => ({
            ...s,
            expectedReceipts: [...(s.expectedReceipts || []), { company: '', ingredientId: '', quantity: '' }]
        }));
    };

    const updateReceiptRow = (index, field, value) => {
        setStatus(s => {
            const rows = [...(s.expectedReceipts || [])];
            rows[index] = { ...rows[index], [field]: value };
            return { ...s, expectedReceipts: rows };
        });
    };

    const removeReceiptRow = (index) => {
        setStatus(s => {
            const rows = [...(s.expectedReceipts || [])];
            rows.splice(index, 1);
            return { ...s, expectedReceipts: rows };
        });
    };

    const handleSave = async () => {
        try {
            const payload = {
                isActive: status.isActive,
                companyName: status.companyName,
                expectedReceipts: (status.expectedReceipts || []).map(r => ({
                    company: r.company,
                    ingredientId: r.ingredientId,
                    quantity: Number(r.quantity)
                }))
            };
            await api.post('/settings/delivery-status', payload);
            showNotification('Annonce mise à jour !', 'success');
        } catch (err) {
            showNotification("Erreur.", 'error');
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Annonce de Livraison - Commande Matières Premières</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                <TextField size="small" label="Nom du fournisseur(s)" value={status.companyName} onChange={e => setStatus({ ...status, companyName: e.target.value })} sx={{ flexGrow: 1 }} />
                <FormControlLabel control={<Switch checked={status.isActive} onChange={e => setStatus({ ...status, isActive: e.target.checked })} />} label="Afficher" />
            </Box>

            <Typography variant="subtitle1" gutterBottom>Produits et quantités à recevoir par entreprise</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Entreprise</TableCell>
                            <TableCell>Matière Première</TableCell>
                            <TableCell align="right">Quantité</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(status.expectedReceipts || []).map((row, idx) => (
                            <TableRow key={idx}>
                                <TableCell>
                                    <TextField size="small" value={row.company || ''} onChange={e => updateReceiptRow(idx, 'company', e.target.value)} placeholder="Nom entreprise" />
                                </TableCell>
                                <TableCell>
                                    <Select size="small" value={row.ingredientId || ''} onChange={e => updateReceiptRow(idx, 'ingredientId', e.target.value)} sx={{ minWidth: 220 }}>
                                        {ingredients.map(ing => (
                                            <MenuItem key={ing._id} value={ing._id}>{ing.name}</MenuItem>
                                        ))}
                                    </Select>
                                </TableCell>
                                <TableCell align="right">
                                    <TextField size="small" type="number" value={row.quantity || ''} onChange={e => updateReceiptRow(idx, 'quantity', e.target.value)} inputProps={{ min: 0 }} sx={{ maxWidth: 120 }} />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton color="error" size="small" onClick={() => removeReceiptRow(idx)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={4}>
                                <Button size="small" onClick={addReceiptRow}>Ajouter une ligne</Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={handleSave}>Enregistrer</Button>
            </Box>
        </Paper>
    );
};

// 10.1 Prévision de commande (fin de semaine)
// L'admin définit un "stock permanent" par matière première.
// La quantité à commander est calculée automatiquement : max(0, permanentStock - stock).
const OrderForecastManager = () => {
  const { showNotification } = useNotification();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIngredients = useCallback(async () => {
    try {
      const { data } = await api.get('/ingredients');
      const normalized = (data || []).map(ing => ({
        ...ing,
        editedPermanentStock: (typeof ing.permanentStock === 'number') ? ing.permanentStock : 0,
        editedSupplierName: (typeof ing.supplierName === 'string') ? ing.supplierName : '',
        editedSupplierUnitPrice: (typeof ing.supplierUnitPrice === 'number') ? ing.supplierUnitPrice : 0,
      }));
      setIngredients(normalized);
    } catch (err) {
      showNotification("Impossible de charger les ingrédients pour la prévision.", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchIngredients();

    const handleDataUpdate = (data) => {
      if (data.type === 'INGREDIENTS_UPDATED') {
        fetchIngredients();
      }
    };
    socket.on('data-updated', handleDataUpdate);
    return () => {
      socket.off('data-updated', handleDataUpdate);
    };
  }, [fetchIngredients]);

  const handlePermanentChange = (id, value) => {
    setIngredients(prev => prev.map(i => i._id === id ? { ...i, editedPermanentStock: value } : i));
  };

  const handleSupplierNameChange = (id, value) => {
    setIngredients(prev => prev.map(i => i._id === id ? { ...i, editedSupplierName: value } : i));
  };

  const handleSupplierUnitPriceChange = (id, value) => {
    setIngredients(prev => prev.map(i => i._id === id ? { ...i, editedSupplierUnitPrice: value } : i));
  };

  const handleSaveForecastRow = useCallback((id) => {
    setIngredients(prev => {
      const ing = prev.find(i => i._id === id);
      if (!ing) return prev;

      const parsedPermanent = Number(ing.editedPermanentStock);
      if (Number.isNaN(parsedPermanent) || parsedPermanent < 0) {
        showNotification("Veuillez entrer un stock permanent valide (>= 0).", "error");
        return prev.map(i =>
          i._id === id
            ? { ...i, editedPermanentStock: (typeof i.permanentStock === 'number') ? i.permanentStock : 0 }
            : i
        );
      }

      const supplierName = (typeof ing.editedSupplierName === 'string') ? ing.editedSupplierName.trim() : '';

      const parsedUnitPrice = Number(ing.editedSupplierUnitPrice);
      if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
        showNotification("Veuillez entrer un prix unitaire valide (>= 0).", "error");
        return prev.map(i =>
          i._id === id
            ? { ...i, editedSupplierUnitPrice: (typeof i.supplierUnitPrice === 'number') ? i.supplierUnitPrice : 0 }
            : i
        );
      }

      const currentPermanent = (typeof ing.permanentStock === 'number') ? ing.permanentStock : 0;
      const currentSupplierName = (typeof ing.supplierName === 'string') ? ing.supplierName : '';
      const currentUnitPrice = (typeof ing.supplierUnitPrice === 'number') ? ing.supplierUnitPrice : 0;

      const nothingChanged =
        parsedPermanent === currentPermanent &&
        supplierName === currentSupplierName &&
        parsedUnitPrice === currentUnitPrice;
      if (nothingChanged) return prev;

      const updated = prev.map(i =>
        i._id === id ? {
          ...i,
          permanentStock: parsedPermanent,
          editedPermanentStock: parsedPermanent,
          supplierName,
          editedSupplierName: supplierName,
          supplierUnitPrice: parsedUnitPrice,
          editedSupplierUnitPrice: parsedUnitPrice,
        } : i
      );

      api.put(`/ingredients/${id}`, {
        permanentStock: parsedPermanent,
        supplierName,
        supplierUnitPrice: parsedUnitPrice,
      })
        .then(() => {
          showNotification("Prévision mise à jour (fournisseur/prix/stock permanent).", "success");
        })
        .catch(() => {
          showNotification("Erreur lors de la mise à jour de la prévision.", "error");
          setIngredients(prev2 =>
            prev2.map(i =>
              i._id === id
                ? {
                  ...i,
                  editedPermanentStock: (typeof i.permanentStock === 'number') ? i.permanentStock : 0,
                  editedSupplierName: (typeof i.supplierName === 'string') ? i.supplierName : '',
                  editedSupplierUnitPrice: (typeof i.supplierUnitPrice === 'number') ? i.supplierUnitPrice : 0,
                }
                : i
            )
          );
        });

      return updated;
    });
  }, [showNotification]);

  const rows = useMemo(() => {
    const mapped = (ingredients || []).map(ing => {
      const permanent = (typeof ing.permanentStock === 'number') ? ing.permanentStock : 0;
      const stock = Number(ing.stock) || 0;
      const toOrder = Math.max(0, permanent - stock);
      const supplierName = (typeof ing.supplierName === 'string' && ing.supplierName.trim()) ? ing.supplierName.trim() : 'Sans fournisseur';
      const supplierUnitPrice = (typeof ing.supplierUnitPrice === 'number') ? ing.supplierUnitPrice : 0;
      const cost = toOrder * supplierUnitPrice;
      return { ...ing, permanent, stock, toOrder, supplierName, supplierUnitPrice, cost };
    });
    // Mettre en avant ce qui doit être commandé
    mapped.sort((a, b) => (b.toOrder - a.toOrder) || a.name.localeCompare(b.name));
    return mapped;
  }, [ingredients]);

  const totalToOrder = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.toOrder) || 0), 0);
  }, [rows]);

  const totalCost = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  }, [rows]);

  const suppliers = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const key = r.supplierName || 'Sans fournisseur';
      if (!map[key]) {
        map[key] = { supplierName: key, rows: [], totalToOrder: 0, totalCost: 0 };
      }
      map[key].rows.push(r);
      map[key].totalToOrder += Number(r.toOrder) || 0;
      map[key].totalCost += Number(r.cost) || 0;
    }
    return Object.values(map)
      .map(g => ({ ...g, rows: g.rows.sort((a, b) => (b.toOrder - a.toOrder) || a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  }, [rows]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>;
  }

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Prévision de commande (Fin de semaine)</Typography>
          <Typography variant="body2" color="text.secondary">
            Définissez un <strong>stock permanent</strong>, un <strong>fournisseur</strong> et un <strong>prix unitaire</strong>. L'app calcule automatiquement la <strong>quantité à commander</strong> et le <strong>total</strong>.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Chip
            label={`Total à commander: ${totalToOrder}`}
            color={totalToOrder > 0 ? 'warning' : 'success'}
            variant="outlined"
          />
          <Chip
            label={`Total estimé: $${Number(totalCost || 0).toFixed(2)}`}
            color={totalCost > 0 ? 'info' : 'success'}
            variant="outlined"
          />
        </Box>
      </Box>

      {suppliers.map(group => (
        <Accordion key={group.supplierName} defaultExpanded={group.totalToOrder > 0} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <Typography sx={{ fontWeight: 700 }}>{group.supplierName}</Typography>
              <Chip
                label={`À commander: ${group.totalToOrder}`}
                color={group.totalToOrder > 0 ? 'warning' : 'success'}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Total: $${Number(group.totalCost || 0).toFixed(2)}`}
                color={group.totalCost > 0 ? 'info' : 'success'}
                size="small"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Matière Première</TableCell>
                    <TableCell>Unité</TableCell>
                    <TableCell align="right">Stock actuel</TableCell>
                    <TableCell align="right">Stock permanent</TableCell>
                    <TableCell>Fournisseur</TableCell>
                    <TableCell align="right">Prix unitaire</TableCell>
                    <TableCell align="right">À commander</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.rows.map(r => (
                    <TableRow key={r._id} hover>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell align="right">{r.stock}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={r.editedPermanentStock}
                          onChange={(e) => handlePermanentChange(r._id, e.target.value)}
                          onBlur={() => handleSaveForecastRow(r._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          sx={{ width: '140px' }}
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={r.editedSupplierName}
                          onChange={(e) => handleSupplierNameChange(r._id, e.target.value)}
                          onBlur={() => handleSaveForecastRow(r._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          sx={{ minWidth: 180 }}
                          placeholder="Nom fournisseur"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={r.editedSupplierUnitPrice}
                          onChange={(e) => handleSupplierUnitPriceChange(r._id, e.target.value)}
                          onBlur={() => handleSaveForecastRow(r._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          sx={{ width: '140px' }}
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={r.toOrder}
                          color={r.toOrder > 0 ? 'warning' : 'success'}
                          size="small"
                          variant={r.toOrder > 0 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 700 }}>
                          ${Number(r.cost || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Bon de commande (unique) - pour la totalité à commander, séparé par fournisseur */}
      <Box sx={{ mt: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Bon de commande (total)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`Total à commander: ${totalToOrder}`}
                color={totalToOrder > 0 ? 'warning' : 'success'}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Total estimé: $${Number(totalCost || 0).toFixed(2)}`}
                color={totalCost > 0 ? 'info' : 'success'}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>

          {totalToOrder <= 0 ? (
            <Typography variant="body2" color="text.secondary">
              Rien à commander pour le moment.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {suppliers
                .filter(g => (Number(g.totalToOrder) || 0) > 0)
                .map(g => (
                  <Box key={`po-global-${g.supplierName}`}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Fournisseur : {g.supplierName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`À commander: ${g.totalToOrder}`}
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Total: $${Number(g.totalCost || 0).toFixed(2)}`}
                          color="info"
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Produit</TableCell>
                            <TableCell>Unité</TableCell>
                            <TableCell align="right">Quantité</TableCell>
                            <TableCell align="right">Prix unitaire</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {g.rows
                            .filter(r => (Number(r.toOrder) || 0) > 0)
                            .map(r => (
                              <TableRow key={`po-global-row-${r._id}`}>
                                <TableCell>{r.name}</TableCell>
                                <TableCell>{r.unit}</TableCell>
                                <TableCell align="right">{r.toOrder}</TableCell>
                                <TableCell align="right">${Number(r.supplierUnitPrice || 0).toFixed(2)}</TableCell>
                                <TableCell align="right">${Number(r.cost || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          <TableRow>
                            <TableCell colSpan={4} align="right" sx={{ fontWeight: 700 }}>
                              Total fournisseur
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              ${Number(g.totalCost || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Typography sx={{ fontWeight: 900 }}>
                  Total général : ${Number(totalCost || 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Paper>
  );
};

// 11. Configuration Webhook
const WebhookConfigManager = () => {
    const { showNotification } = useNotification();
    const [config, setConfig] = useState({ enabled: false, url: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const { data } = await api.get('/settings/webhook-config');
            setConfig(data);
        } catch (err) {
            console.error('Erreur lors du chargement de la configuration webhook:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.post('/settings/webhook-config', config);
            showNotification('Configuration webhook mise à jour !', 'success');
        } catch (err) {
            showNotification('Erreur lors de la mise à jour.', 'error');
        }
    };

    const handleTest = async () => {
        try {
            // D'abord sauvegarder la configuration actuelle
            await api.post('/settings/webhook-config', config);
            
            // Puis envoyer une notification de test
            const response = await api.post('/settings/webhook-test');
            console.log('Réponse test webhook:', response.data);
            showNotification(`Notification de test envoyée ! URL: ${response.data.webhookUrl}`, 'success');
        } catch (err) {
            console.error('Erreur test webhook:', err);
            const errorMessage = err.response?.data?.message || 'Erreur lors de l\'envoi du test.';
            showNotification(errorMessage, 'error');
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>;
    }

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Configuration des Notifications Webhook</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={config.enabled}
                            onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                        />
                    }
                    label="Activer les notifications webhook"
                />
                <TextField
                    size="small"
                    label="URL du webhook"
                    value={config.url}
                    onChange={e => setConfig({ ...config, url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    fullWidth
                    disabled={!config.enabled}
                />
                <Typography variant="body2" color="text.secondary">
                    Les notifications seront envoyées lors des modifications de stock des produits et ingrédients.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" onClick={handleSave}>
                        Enregistrer
                    </Button>
                    {config.enabled && config.url && (
                        <Button variant="outlined" onClick={handleTest}>
                            Tester la connexion
                        </Button>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

// 12. Demandes de Réinitialisation de Mot de Passe
const ResetTokenManager = () => {
    const [tokens, setTokens] = useState([]);
    useEffect(() => {
        api.get('/users/reset-tokens').then(res => setTokens(res.data)).catch(err => console.error("Erreur."));
    }, []);
    return (
        <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Demandes de Réinitialisation en Attente</Typography>
            {tokens.length > 0 ? (
                <List dense>{tokens.map(t => (
                    <ListItem key={t._id} divider>
                        <ListItemText 
                            primary={`Utilisateur : ${t.userId?.username || 'Inconnu'}`}
                            secondary={`Token à transmettre : ${t.token}`}
                            secondaryTypographyProps={{ fontFamily: 'monospace', color: 'primary.main', mt: 0.5 }}
                        />
                    </ListItem>
                ))}</List>
            ) : (<Typography variant="body2">Aucune demande en attente.</Typography>)}
        </Paper>
    );
};

// 13. Gestion des Notes de Frais
const ExpenseNoteManager = () => {
    const { showNotification, confirm } = useNotification();
    const [expenseNotes, setExpenseNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
    const [rejectDialog, setRejectDialog] = useState({ open: false, id: null, reason: '' });
    const [imageDialog, setImageDialog] = useState({ open: false, url: null });

    const fetchExpenseNotes = useCallback(async () => {
        try {
            const { data } = await api.get('/expense-notes');
            setExpenseNotes(data);
        } catch (err) {
            showNotification("Impossible de charger les notes de frais.", "error");
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchExpenseNotes();

        const handleDataUpdate = (data) => {
            if (data.type === 'EXPENSE_NOTES_UPDATED') {
                fetchExpenseNotes();
            }
        };

        socket.on('data-updated', handleDataUpdate);
        return () => {
            socket.off('data-updated', handleDataUpdate);
        };
    }, [fetchExpenseNotes]);

    const handleApprove = async (id) => {
        try {
            await api.put(`/expense-notes/${id}/approve`);
            showNotification("Note de frais approuvée. La somme sera ajoutée au salaire de l'employé.", "success");
        } catch (err) {
            showNotification(err.response?.data?.message || "Erreur lors de l'approbation.", "error");
        }
    };

    const handleReject = async () => {
        try {
            await api.put(`/expense-notes/${rejectDialog.id}/reject`, {
                rejectionReason: rejectDialog.reason || 'Non spécifié'
            });
            showNotification("Note de frais rejetée.", "success");
            setRejectDialog({ open: false, id: null, reason: '' });
        } catch (err) {
            showNotification(err.response?.data?.message || "Erreur lors du rejet.", "error");
        }
    };

    const handleDelete = async (id) => {
        const shouldDelete = await confirm(
            "Êtes-vous sûr de vouloir supprimer cette note de frais ? Si elle était approuvée, la dépense associée sera également supprimée.",
            {
                title: 'Confirmer la suppression',
                severity: 'error',
                confirmText: 'Supprimer',
                cancelText: 'Annuler'
            }
        );
        if (shouldDelete) {
            try {
                await api.delete(`/expense-notes/${id}`);
                showNotification("Note de frais supprimée.", "success");
            } catch (err) {
                showNotification(err.response?.data?.message || "Erreur lors de la suppression.", "error");
            }
        }
    };

    const filteredNotes = filter === 'all' 
        ? expenseNotes 
        : expenseNotes.filter(note => note.status === filter);

    const getStatusChip = (status) => {
        switch (status) {
            case 'approved':
                return <Chip icon={<CheckCircleIcon />} label="Approuvée" color="success" size="small" />;
            case 'rejected':
                return <Chip icon={<CancelIcon />} label="Rejetée" color="error" size="small" />;
            default:
                return <Chip label="En attente" color="warning" size="small" />;
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>;
    }

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Gestion des Notes de Frais</Typography>
            
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button 
                    variant={filter === 'all' ? 'contained' : 'outlined'} 
                    size="small"
                    onClick={() => setFilter('all')}
                >
                    Toutes ({expenseNotes.length})
                </Button>
                <Button 
                    variant={filter === 'pending' ? 'contained' : 'outlined'} 
                    size="small"
                    onClick={() => setFilter('pending')}
                >
                    En attente ({expenseNotes.filter(n => n.status === 'pending').length})
                </Button>
                <Button 
                    variant={filter === 'approved' ? 'contained' : 'outlined'} 
                    size="small"
                    onClick={() => setFilter('approved')}
                >
                    Approuvées ({expenseNotes.filter(n => n.status === 'approved').length})
                </Button>
                <Button 
                    variant={filter === 'rejected' ? 'contained' : 'outlined'} 
                    size="small"
                    onClick={() => setFilter('rejected')}
                >
                    Rejetées ({expenseNotes.filter(n => n.status === 'rejected').length})
                </Button>
            </Box>

            {filteredNotes.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    Aucune note de frais {filter !== 'all' ? `(${filter})` : ''}.
                </Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Employé</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Nom / Prénom</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Montant</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Statut</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Image</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredNotes.map((note) => (
                                <TableRow key={note._id}>
                                    <TableCell>{note.employeeId?.username || 'Inconnu'}</TableCell>
                                    <TableCell>{note.firstName} {note.lastName}</TableCell>
                                    <TableCell>{new Date(note.date).toLocaleDateString('fr-FR')}</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                            ${note.amount.toFixed(2)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">{getStatusChip(note.status)}</TableCell>
                                    <TableCell>
                                        <Button
                                            size="small"
                                            onClick={() => setImageDialog({ open: true, url: note.imageUrl })}
                                        >
                                            Voir
                                        </Button>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {note.status === 'pending' && (
                                                <>
                                                    <IconButton
                                                        color="success"
                                                        size="small"
                                                        onClick={() => handleApprove(note._id)}
                                                        title="Approuver"
                                                    >
                                                        <CheckCircleIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        color="error"
                                                        size="small"
                                                        onClick={() => setRejectDialog({ open: true, id: note._id, reason: '' })}
                                                        title="Rejeter"
                                                    >
                                                        <CancelIcon />
                                                    </IconButton>
                                                </>
                                            )}
                                            {note.status === 'rejected' && note.rejectionReason && (
                                                <Typography variant="caption" color="error" sx={{ mr: 1 }}>
                                                    {note.rejectionReason}
                                                </Typography>
                                            )}
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(note._id)}
                                                title="Supprimer"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialog de rejet */}
            <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, id: null, reason: '' })}>
                <DialogTitle>Rejeter la note de frais</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Raison du rejet"
                        value={rejectDialog.reason}
                        onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                        sx={{ mt: 1 }}
                        placeholder="Expliquez pourquoi cette note de frais est rejetée..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialog({ open: false, id: null, reason: '' })}>
                        Annuler
                    </Button>
                    <Button onClick={handleReject} color="error" variant="contained">
                        Rejeter
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog pour afficher l'image */}
            <Dialog 
                open={imageDialog.open} 
                onClose={() => setImageDialog({ open: false, url: null })}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Image de la note de frais</DialogTitle>
                <DialogContent>
                    {imageDialog.url && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                            <img 
                                src={imageDialog.url} 
                                alt="Note de frais" 
                                style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '70vh', 
                                    objectFit: 'contain',
                                    borderRadius: '8px'
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                                }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setImageDialog({ open: false, url: null })}>Fermer</Button>
                </DialogActions>
            </Dialog>
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
    });
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>Panneau Administrateur</Typography>
      
      <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Gestion & Solde</Typography></AccordionSummary><AccordionDetails><Grid container spacing={2}><Grid item xs={12} md={7}><WeekManager onWeekChange={setViewedWeek} currentWeek={currentWeek} viewedWeek={viewedWeek} /></Grid><Grid item xs={12} md={5}><AccountBalanceManager viewedWeek={viewedWeek} /></Grid></Grid></AccordionDetails></Accordion>
      <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Résumé Financier (Semaine {viewedWeek})</Typography></AccordionSummary><AccordionDetails><FinancialSummary viewedWeek={viewedWeek} /></AccordionDetails></Accordion>
      <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Ventes de la Semaine (Semaine {viewedWeek})</Typography></AccordionSummary><AccordionDetails><WeeklySalesChart viewedWeek={viewedWeek} /></AccordionDetails></Accordion>
      <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Menus les Plus Vendus (Semaine {viewedWeek})</Typography></AccordionSummary><AccordionDetails><MenuSalesChart viewedWeek={viewedWeek} /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Performance des Employés</Typography></AccordionSummary><AccordionDetails><EmployeePerformance viewedWeek={viewedWeek} /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Relevé des Transactions</Typography></AccordionSummary><AccordionDetails><TransactionLog viewedWeek={viewedWeek} /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Gestion des Entrées / Sorties</Typography></AccordionSummary><AccordionDetails><IncomeExpenseManager viewedWeek={viewedWeek} /></AccordionDetails></Accordion>
      <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Prévision de commande</Typography></AccordionSummary><AccordionDetails><OrderForecastManager /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Gestion des Utilisateurs</Typography></AccordionSummary><AccordionDetails><UserManager /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Annonces & Paramètres</Typography></AccordionSummary><AccordionDetails><Grid container spacing={2}><Grid item xs={12} md={6}><DeliveryStatusManager /></Grid><Grid item xs={12}><AdminNotificationsManager /></Grid><Grid item xs={12}><WebhookConfigManager /></Grid><Grid item xs={12}><ResetTokenManager /></Grid></Grid></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Gestion des Produits</Typography></AccordionSummary><AccordionDetails><ProductManager /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Notes de Frais</Typography></AccordionSummary><AccordionDetails><ExpenseNoteManager /></AccordionDetails></Accordion>
    </Container>
  );
}

export default AdminPage;