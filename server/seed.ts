import bcrypt from 'bcrypt';
import { db } from './db';
import { users, ddoCodes } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Database Seed Script
 * Creates default admin user and initial data for the HP Tourism portal
 * Safe to run multiple times (idempotent)
 */

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Check if admin user already exists
    const existingAdmin = await db.select()
      .from(users)
      .where(eq(users.mobile, '9999999999'))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists (mobile: 9999999999)');
      
      // Update to ensure role is admin
      await db.update(users)
        .set({ role: 'admin', isActive: true })
        .where(eq(users.mobile, '9999999999'));
      
      console.log('✅ Admin role verified and updated');
    } else {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.insert(users).values({
        mobile: '9999999999',
        password: hashedPassword,
        fullName: 'System Administrator',
        role: 'admin',
        isActive: true,
      });
      
      console.log('✅ Admin user created successfully');
      console.log('   Mobile: 9999999999');
      console.log('   Password: admin123');
      console.log('   ⚠️  IMPORTANT: Change this password in production!');
    }

    // Seed DDO codes for district-wise payment routing
    console.log('🏛️  Seeding DDO codes for all districts...');
    
    const ddoData = [
      { district: 'Chamba', ddoCode: 'CHM00-532', ddoDescription: 'D.T.D.O. CHAMBA', treasuryCode: 'CHM00' },
      { district: 'Bharmour', ddoCode: 'CHM01-001', ddoDescription: 'S.D.O.(CIVIL) BHARMOUR', treasuryCode: 'CHM01' },
      { district: 'Shimla (Central)', ddoCode: 'CTO00-068', ddoDescription: 'A.C. (TOURISM) SHIMLA', treasuryCode: 'CTO00' },
      { district: 'Hamirpur', ddoCode: 'HMR00-053', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICE HAMIRPUR (UNA)', treasuryCode: 'HMR00' },
      { district: 'Kullu (Dhalpur)', ddoCode: 'KLU00-532', ddoDescription: 'DEPUTY DIRECTOR TOURISM AND CIVIL AVIATION KULLU DHALPUR', treasuryCode: 'KLU00' },
      { district: 'Kullu', ddoCode: 'KLU04-532', ddoDescription: 'DEPUTY DIRECTOR, TOURISM &CIVIL AVIATION, KULLU', treasuryCode: 'KLU04' },
      { district: 'Kangra', ddoCode: 'KNG00-532', ddoDescription: 'DIV.TOURISM DEV.OFFICER(DTDO) DHARAMSALA', treasuryCode: 'KNG00' },
      { district: 'Kinnaur', ddoCode: 'KNR00-031', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICER KINNAUR AT RECKONG PEO', treasuryCode: 'KNR00' },
      { district: 'Lahaul-Spiti (Kaza)', ddoCode: 'KZA00-011', ddoDescription: 'PO ITDP KAZA', treasuryCode: 'KZA00' },
      { district: 'Lahaul', ddoCode: 'LHL00-017', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICER', treasuryCode: 'LHL00' },
      { district: 'Mandi', ddoCode: 'MDI00-532', ddoDescription: 'DIV. TOURISM DEV. OFFICER MANDI', treasuryCode: 'MDI00' },
      { district: 'Pangi', ddoCode: 'PNG00-003', ddoDescription: 'PROJECT OFFICER ITDP PANGI', treasuryCode: 'PNG00' },
      { district: 'Shimla', ddoCode: 'SML00-532', ddoDescription: 'DIVISIONAL TOURISM OFFICER SHIMLA', treasuryCode: 'SML00' },
      { district: 'Sirmour', ddoCode: 'SMR00-055', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICE NAHAN', treasuryCode: 'SMR00' },
      { district: 'Solan', ddoCode: 'SOL00-046', ddoDescription: 'DTDO SOLAN', treasuryCode: 'SOL00' },
    ];

    // Insert DDO codes (skip if already exist)
    for (const ddo of ddoData) {
      const existing = await db.select()
        .from(ddoCodes)
        .where(eq(ddoCodes.district, ddo.district))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(ddoCodes).values(ddo);
      }
    }
    
    console.log(`✅ DDO codes seeded successfully (${ddoData.length} districts)`);

    console.log('🎉 Database seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
