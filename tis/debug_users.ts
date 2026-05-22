import { query } from "./src/lib/db";

async function debug() {
  try {
    const result = await query("SELECT * FROM users WHERE email = ?", ["arun@technosprint.net"]);
    console.log("Full user record:");
    console.log(JSON.stringify(result, null, 2));
    
    // Also check with lowercase
    const result2 = await query("SELECT * FROM users WHERE LOWER(email) = ?", ["arun@technosprint.net".toLowerCase()]);
    console.log("\nWith LOWER() function:");
    console.log(JSON.stringify(result2, null, 2));
    
    // Check all users
    const all = await query("SELECT id, email, password_hash, is_active, role FROM users");
    console.log("\nAll users in database:");
    console.log(JSON.stringify(all, null, 2));
    
    process.exit(0);
  } catch (e: any) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

debug();
