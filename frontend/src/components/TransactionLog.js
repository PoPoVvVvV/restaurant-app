// Composant pour le relevé des transactions
const TransactionLog = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTransactions = async () => {
      try {
        const { data } = await api.get('/transactions');
        setTransactions(data);
      } catch (err) {
        console.error("Erreur lors de la récupération des transactions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTransactions();
  }, []);

  const handleExport = async () => {
    try {
      const response = await api.get('/reports/transactions/export', {
        responseType: 'blob', // Important pour recevoir un fichier
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions-export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur lors de l'export", err);
      alert("Impossible de générer l'export CSV.");
    }
  };

  if (loading) return <p>Chargement des transactions...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2>Relevé des Transactions</h2>
        <button onClick={handleExport}>Exporter en CSV</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid black' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Employé</th>
            <th style={{ textAlign: 'right', padding: '8px' }}>Montant</th>
            <th style={{ textAlign: 'right', padding: '8px' }}>Marge</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t._id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{new Date(t.createdAt).toLocaleString('fr-FR')}</td>
              <td style={{ padding: '8px' }}>{t.employeeId?.username || 'Utilisateur supprimé'}</td>
              <td style={{ textAlign: 'right', padding: '8px' }}>${t.totalAmount.toFixed(2)}</td>
              <td style={{ textAlign: 'right', padding: '8px', color: t.margin > 0 ? 'green' : 'red' }}>${t.margin.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};