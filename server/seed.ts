import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '../shared/schema';
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

    console.log('🎉 Database seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
