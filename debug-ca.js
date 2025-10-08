// Script de diagnostic pour vérifier le CA total par employé
import mongoose from 'mongoose';
import Transaction from './models/Transaction.js';
import User from './models/User.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-app');
    console.log('MongoDB connecté');
  } catch (error) {
    console.error('Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

const checkEmployeeCA = async () => {
  try {
    console.log('=== DIAGNOSTIC CA TOTAL PAR EMPLOYÉ ===\n');
    
    // Récupérer tous les utilisateurs
    const users = await User.find({}, 'username grade');
    console.log('Utilisateurs trouvés:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.grade}) - ID: ${user._id}`);
    });
    console.log('\n');
    
    // Calculer le CA total pour chaque employé
    const caData = await Transaction.aggregate([
      {
        $group: {
          _id: '$employeeId',
          totalRevenue: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 },
          weeks: { $addToSet: '$weekId' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      {
        $unwind: '$employeeInfo'
      },
      {
        $project: {
          _id: 0,
          employeeId: '$_id',
          username: '$employeeInfo.username',
          grade: '$employeeInfo.grade',
          totalRevenue: '$totalRevenue',
          transactionCount: '$transactionCount',
          weeks: '$weeks'
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);
    
    console.log('=== CA TOTAL PAR EMPLOYÉ ===');
    caData.forEach(data => {
      const isUnlocked = data.totalRevenue >= 20000;
      console.log(`\n${data.username} (${data.grade}):`);
      console.log(`  - CA Total: $${data.totalRevenue.toFixed(2)}`);
      console.log(`  - Nombre de transactions: ${data.transactionCount}`);
      console.log(`  - Semaines: ${data.weeks.sort().join(', ')}`);
      console.log(`  - Flappy Bird débloqué: ${isUnlocked ? '✅ OUI' : '❌ NON'}`);
    });
    
    // Vérifier spécifiquement la logique de déblocage
    console.log('\n=== VÉRIFICATION LOGIQUE DÉBLOCAGE ===');
    const flappyBirdThreshold = 20000;
    const eligibleEmployees = caData.filter(data => data.totalRevenue >= flappyBirdThreshold);
    
    console.log(`Seuil requis: $${flappyBirdThreshold}`);
    console.log(`Employés éligibles: ${eligibleEmployees.length}`);
    
    if (eligibleEmployees.length > 0) {
      console.log('\nEmployés qui devraient avoir Flappy Bird débloqué:');
      eligibleEmployees.forEach(emp => {
        console.log(`- ${emp.username}: $${emp.totalRevenue.toFixed(2)}`);
      });
    } else {
      console.log('\nAucun employé n\'atteint le seuil de $20,000');
    }
    
  } catch (error) {
    console.error('Erreur lors du diagnostic:', error);
  }
};

const main = async () => {
  await connectDB();
  await checkEmployeeCA();
  process.exit(0);
};

main();
