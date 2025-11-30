import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import UserManager from '../components/UserManager';

// Imports depuis Material-UI
import {
  Container, Box, Paper, Typography, Grid, Button, TextField, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Switch, FormControlLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

// --- SOUS-COMPOSANTS DE LA PAGE ADMIN ---

// 1. Gestion de la Semaine
const WeekManager = ({ onWeekChange, currentWeek, viewedWeek }) => {
    const { showNotification } = useNotification();
    const handleNewWeek = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir terminer la semaine ${currentWeek} et commencer une nouvelle semaine ?`)) {
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

// 6. Paramètres et Employés
const GeneralSettings = () => {
    const { showNotification } = useNotification();
    const [bonusPercentage, setBonusPercentage] = useState(0);
    const [newCode, setNewCode] = useState('');
    const [users, setUsers] = useState([]);
    const fetchUsers = async () => { api.get('/users').then(res => setUsers(res.data)); };
    useEffect(() => {
        api.get('/settings/bonusPercentage').then(res => setBonusPercentage(res.data.value * 100));
        fetchUsers();
    }, []);
    const handleSaveBonus = async () => { await api.post('/settings', { key: 'bonusPercentage', value: parseFloat(bonusPercentage) / 100 }); showNotification('Prime enregistrée !', 'success'); };
    const generateInviteCode = async () => { const { data } = await api.post('/users/generate-code'); setNewCode(data.invitationCode); };
    const handleToggleStatus = async (userId) => { try { await api.put(`/users/${userId}/status`); fetchUsers(); showNotification("Statut mis à jour.", 'info'); } catch (err) { showNotification("Erreur.", 'error'); } };
    const handleGradeChange = async (userId, newGrade) => { try { await api.put(`/users/${userId}/grade`, { grade: newGrade }); setUsers(users.map(u => u._id === userId ? { ...u, grade: newGrade } : u)); showNotification("Grade mis à jour !", "success"); } catch (err) { showNotification("Erreur.", "error"); } };
    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}><Typography>Prime sur marge :</Typography><TextField size="small" type="number" value={bonusPercentage} onChange={e => setBonusPercentage(e.target.value)} sx={{ width: '80px' }} /><Typography>%</Typography><Button variant="contained" onClick={handleSaveBonus}>Enregistrer</Button></Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}><Button variant="contained" onClick={generateInviteCode}>Générer Code Invitation</Button>{newCode && <Typography fontFamily="monospace" sx={{ p: 1, bgcolor: 'action.hover' }}>{newCode}</Typography>}</Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead><TableRow><TableCell>Nom d'utilisateur</TableCell><TableCell>Rôle</TableCell><TableCell>Grade</TableCell><TableCell>Statut</TableCell><TableCell align="center">Actions</TableCell></TableRow></TableHead>
                    <TableBody>{users.map(user => (<TableRow key={user._id}><TableCell>{user.username}</TableCell><TableCell>{user.role}</TableCell><TableCell><Select value={user.grade || 'Novice'} onChange={(e) => handleGradeChange(user._id, e.target.value)} size="small" variant="standard" sx={{ minWidth: 120 }}><MenuItem value="Novice">Novice</MenuItem><MenuItem value="Confirmé">Confirmé</MenuItem><MenuItem value="Expérimenté">Expérimenté</MenuItem><MenuItem value="Manageuse">Manageuse</MenuItem><MenuItem value="Co-Patronne">Co-Patronne</MenuItem><MenuItem value="Patron">Patron</MenuItem></Select></TableCell><TableCell><Chip label={user.isActive ? "Actif" : "Désactivé"} color={user.isActive ? "success" : "error"} size="small" /></TableCell><TableCell align="center"><Button variant="outlined" size="small" onClick={() => handleToggleStatus(user._id)}>{user.isActive ? "Désactiver" : "Activer"}</Button></TableCell></TableRow>))}</TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

// 7. Relevé des Transactions
const TransactionLog = ({ viewedWeek }) => {
  const { showNotification } = useNotification();
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
  const handleDelete = async (id) => { if(window.confirm('Sûr ?')) { try { await api.delete(`/transactions/${id}`); showNotification("Transaction supprimée.", "info"); } catch(err) { showNotification('Erreur.', 'error'); } } };
  
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
    const { showNotification } = useNotification();
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
        if(window.confirm('Sûr ?')) { 
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
  const { showNotification } = useNotification();
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
  const onDelete = async (id) => { if (window.confirm('Sûr ?')) { try { await api.delete(`/products/${id}`); fetchProducts(); showNotification("Produit supprimé.", "info"); } catch (err) { showNotification("Erreur.", "error"); } } };
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
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Gestion des Utilisateurs</Typography></AccordionSummary><AccordionDetails><UserManager /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Annonces, Paramètres & Employés</Typography></AccordionSummary><AccordionDetails><Grid container spacing={2}><Grid item xs={12} md={6}><DeliveryStatusManager /></Grid><Grid item xs={12} md={6}><GeneralSettings /></Grid><Grid item xs={12}><WebhookConfigManager /></Grid><Grid item xs={12}><ResetTokenManager /></Grid></Grid></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Gestion des Produits</Typography></AccordionSummary><AccordionDetails><ProductManager /></AccordionDetails></Accordion>
    </Container>
  );
}

export default AdminPage;