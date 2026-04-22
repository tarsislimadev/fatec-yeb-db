import db from './index.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('Starting database seeding...');

    // Create test user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    await db.query(
      `INSERT INTO app_users (id, email, display_name, password_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, 'test@example.com', 'Test User', hashedPassword, 'active']
    );

    console.log('✅ Created test user (test@example.com / Password123!)');

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
      const channels = ['sms', 'whatsapp', 'telegram', 'signal'];
      for (const channel of channels) {
        await db.query(
          `INSERT INTO phone_channels (id, phone_id, channel_type, is_enabled, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [uuidv4(), phoneId, channel, true]
        );
      }

      // Create default consents
      const consents = ['marketing', 'sms', 'call'];
      for (const consent of consents) {
        await db.query(
          `INSERT INTO phone_consents (id, phone_id, consent_type, status, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [uuidv4(), phoneId, consent, 'unknown']
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
