const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

async function run() {
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(firebaseConfigPath)) {
    console.error("No firebase config");
    return;
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

  const collections = ['tickets', 'companies', 'settings', 'sla_breaches', 'users', 'meetings'];
  for (const colName of collections) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Collection ${colName} has ${snapshot.size} docs`);
      snapshot.forEach(doc => {
        const data = doc.data();
        const dataStr = JSON.stringify(data);
        if (dataStr.toLowerCase().includes('brown') || dataStr.toLowerCase().includes('diverse')) {
          console.log(`Match in Firestore ${colName}/${doc.id}:`, data);
        }
      });
    } catch (err) {
      console.error(`Error querying ${colName}:`, err.message);
    }
  }
}

run().catch(console.error);
