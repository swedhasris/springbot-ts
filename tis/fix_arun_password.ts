import { execute, query } from "./src/lib/db";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

async function fixPassword() {
  try {
    const password = "Poland@01";
    const email = "arun@technosprint.net";
    const passHash = simpleHash(password);

    console.log(`Password: ${password}`);
    console.log(`Expected hash: ${passHash}`);
    
    // Check current state
    const existing = await query("SELECT id, email, password_hash FROM users WHERE email = ?", [email]);
    console.log("Current user in DB:", existing);
    
    if (existing.length > 0) {
      console.log(`Updating password for ${email}...`);
      await execute(
        "UPDATE users SET password_hash = ?, is_active = 1 WHERE email = ?",
        [passHash, email]
      );
      console.log("✓ User updated successfully");
      
      // Verify
      const updated = await query("SELECT email, password_hash FROM users WHERE email = ?", [email]);
      console.log("Updated user:", updated);
    } else {
      console.log("User not found");
    }
    
    process.exit(0);
  } catch (e: any) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

fixPassword();
