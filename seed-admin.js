/**
 * Seed script to create an admin user
 * Usage: node seed-admin.js <email> <password>
 * Example: node seed-admin.js admin@example.com admin123
 */

import { connectDB } from './src/db.js';
import { User } from './src/models/User.js';
import crypto from 'crypto';

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function createAdminUser() {
  try {
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.error('Usage: node seed-admin.js <email> <password>');
      console.error('Example: node seed-admin.js admin@example.com admin123');
      process.exit(1);
    }

    const [email, password] = args;

    await connectDB();
    console.log('Connected to database');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log(`Admin user with email ${email} already exists!`);
        process.exit(0);
      } else {
        // Promote existing user to admin
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log(`✓ Promoted existing user ${email} to admin role`);
        process.exit(0);
      }
    }

    // Create new admin user
    const hashedPassword = await hashPassword(password);
    const telegramAuthCode = crypto.randomInt(100000, 1000000).toString();

    const adminUser = await User.create({
      name: 'Admin User',
      username: `admin_${Date.now()}`,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      telegramAuthCode,
    });

    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('Admin Details:');
    console.log('  ID:', adminUser._id.toString());
    console.log('  Name:', adminUser.name);
    console.log('  Username:', adminUser.username);
    console.log('  Email:', adminUser.email);
    console.log('  Role:', adminUser.role);
    console.log('');
    console.log('You can now login with:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('');
    console.log('After logging in, go to Settings to access the Admin Dashboard.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
