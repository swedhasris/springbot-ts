function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

const password = "Poland@01";
const expectedHash = "h_ps1kdz_9";
const calculatedHash = simpleHash(password);

console.log("Password:", password);
console.log("Expected hash from DB:", expectedHash);
console.log("Calculated hash:", calculatedHash);
console.log("Match:", expectedHash === calculatedHash);
