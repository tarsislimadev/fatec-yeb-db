import { db } from './index.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('Starting database seeding...');

    const people = [
      {
        name: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123!',
      },
      {
        name: 'Alice Johnson',
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'Password123!',
      },
      {
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        password: 'Password456!',
      }
    ];

    let userId = null;

    // Create test users
    for (const person of people) {
      userId = uuidv4();
      const hashedPassword = await bcrypt.hash(person.password, 10);

      await db.query(
        `INSERT INTO app_users (id, email, display_name, password_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, person.email, person.name, hashedPassword, 'active']
      );

      console.log(`✅ Created test user (${person.email} / ${person.password})`);
    }

    // Create test phones
    const phones = [
      {
        e164: '+5511987654321',
        raw: '(11) 98765-4321',
        type: 'mobile',
        countryCode: 'BR',
        nationalNumber: '11987654321',
      },
      {
        e164: '+551133334444',
        raw: '(11) 3333-4444',
        type: 'landline',
        countryCode: 'BR',
        nationalNumber: '1133334444',
      },
      {
        e164: '+5521999887766',
        raw: '(21) 99988-7766',
        type: 'whatsapp',
        countryCode: 'BR',
        nationalNumber: '21999887766',
      },
    ];

    for (const phone of phones) {
      const phoneId = uuidv4();

      // Create phone
      await db.query(
        `INSERT INTO phones (id, e164_number, raw_number, type, country_code, national_number, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [phoneId, phone.e164, phone.raw, phone.type, phone.countryCode, phone.nationalNumber, 'active']
      );

      // Create default channels
      const channels = ['sms', 'whatsapp', 'telegram', 'call'];
      for (const channel of channels) {
        await db.query(
          `INSERT INTO phone_channels (id, phone_id, channel_type, is_enabled, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [uuidv4(), phoneId, channel, true]
        );
      }

      // Create default consents
      const consents = ['marketing', 'transactional'];
      for (const consent of consents) {
        await db.query(
          `INSERT INTO phone_consents (id, phone_id, consent_type, status, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [uuidv4(), phoneId, consent, 'unknown', userId]
        );
      }

      console.log(`✅ Created phone: ${phone.e164}`);
    }

    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
