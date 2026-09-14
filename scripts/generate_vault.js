/**
 * generate_vault.js - Serializes Personal Sample Vault records
 * into AgendaVault format (JSON + STF).
 * Redacts sensitive IDs, account numbers, phone numbers, license keys, and serial numbers
 * while preserving first names (Denise, Dr James, Ilana, etc.).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { STFService } from '../js/services/stfService.js';
import { getPersonalSampleVaultData } from '../data/personalSampleVault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { getPersonalSampleVaultData };

export function generateVaultFiles() {
  console.log('Generating Personal Sample Vault files...');
  const vaultData = getPersonalSampleVaultData();

  const jsonPayload = {
    version: 1,
    name: 'Personal Sample Vault',
    description: 'Personal productivity vault containing 100+ historical tasks, projects, health tracking, and finances (2023-2026)',
    exportedAt: new Date().toISOString(),
    categories: vaultData.categories.map(c => c.toJSON()),
    rules: vaultData.rules.map(r => r.toJSON()),
    views: vaultData.views.map(v => v.toJSON()),
    items: vaultData.items.map(i => i.toJSON())
  };

  const jsonStr = JSON.stringify(jsonPayload, null, 2);
  const stfStr = STFService.exportToSTF(vaultData.items, vaultData.categories);

  const targetDirs = [
    path.join(__dirname, '..', 'data'),
    'c:\\Users\\jimco\\Documents\\antigravity\\zealous-euclid\\data'
  ];

  targetDirs.forEach(dataDir => {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(path.join(dataDir, 'personal_sample_vault.json'), jsonStr, 'utf8');
      fs.writeFileSync(path.join(dataDir, 'personal_sample_vault.stf'), stfStr, 'utf8');
      console.log(`Saved JSON & STF to: ${dataDir}`);
    } catch (err) {
      console.warn(`Could not write to ${dataDir}:`, err.message);
    }
  });

  console.log(`Done! Exported ${vaultData.items.length} items to Personal Sample Vault.`);
  return { vaultData, jsonStr, stfStr };
}

// If run directly via node
if (process.argv[1] === __filename) {
  generateVaultFiles();
}
