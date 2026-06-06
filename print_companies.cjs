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

  const colRef = collection(db, 'companies');
  const snapshot = await getDocs(colRef);
  console.log(`Collection companies has ${snapshot.size} docs:`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

run().catch(console.error);
