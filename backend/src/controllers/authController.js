import bcrypt from 'bcryptjs';
import { db, redis } from '../db/index.js';
import { generateToken, generateResetToken, hashToken } from '../utils/auth.js';
import { successResponse, sendError, ERROR_CODES } from '../utils/response.js';

// ============ SIGNUP ============
export async function signup(req, res) {
  try {
    const { email, password, display_name } = req.body;

    // Validation
    if (!email || !password || !display_name) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required fields: email, password, display_name');
    }

    if (password.length < 8) {
      return sendError(res, 'VALIDATION_ERROR', 'Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
      return sendError(res, 'VALIDATION_ERROR', 'Password must contain uppercase, number, and special character');
    }

    // Check if email exists
    const existingUser = await db.query('SELECT id FROM app_users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return sendError(res, 'CONFLICT', 'Email already registered', {}, 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO app_users (email, password_hash, display_name, status) 
       VALUES ($1, $2, $3, 'active') 
       RETURNING id, email, display_name, status, created_at`,
      [email, passwordHash, display_name]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    return successResponse(res, {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      status: user.status,
      created_at: user.created_at,
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
    }, null, 201);
  } catch (err) {
    console.error('Signup error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Signup failed', {}, 500);
  }
}

// ============ SIGNIN ============
export async function signin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing email or password');
    }

    // Get user
    const userResult = await db.query(
      `SELECT id, email, password_hash, display_name, status, failed_login_attempts, locked_until 
       FROM app_users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid credentials');
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.status === 'locked' && user.locked_until && new Date(user.locked_until) > new Date()) {
      return sendError(res, 'FORBIDDEN', 'Account locked. Try again later');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      // Increment failed attempts
      const newAttempts = user.failed_login_attempts + 1;
      const isLocked = newAttempts >= 5;
      
      if (isLocked) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await db.query(
          `UPDATE app_users SET failed_login_attempts = $1, locked_until = $2, status = 'locked' WHERE id = $3`,
          [newAttempts, lockedUntil, user.id]
        );
        return sendError(res, 'FORBIDDEN', 'Account locked after too many attempts');
      } else {
        await db.query(
          `UPDATE app_users SET failed_login_attempts = $1 WHERE id = $2`,
          [newAttempts, user.id]
        );
      }
      return sendError(res, 'UNAUTHORIZED', 'Invalid credentials');
    }

    // Reset failed attempts and unlock
    await db.query(
      `UPDATE app_users SET failed_login_attempts = 0, locked_until = NULL, status = 'active', last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    const token = generateToken(user.id, user.email);

    return successResponse(res, {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
    });
  } catch (err) {
    console.error('Signin error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Signin failed', {}, 500);
  }
}

// ============ SIGNOUT ============
export async function signout(req, res) {
  try {
    // Token blacklist in Redis (optional, for stateless auth just return 204)
    const token = req.headers.authorization?.slice(7);
    if (token) {
      await redis.setEx(`blacklist:${token}`, 3600, '1');
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Signout error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Signout failed', {}, 500);
  }
}

// ============ FORGOT PASSWORD ============
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 'VALIDATION_ERROR', 'Email is required');
    }

    // Get user
    const userResult = await db.query(
      'SELECT id FROM app_users WHERE email = $1',
      [email]
    );

    // Don't reveal if email exists (security)
    if (userResult.rows.length === 0) {
      return successResponse(res, {
        message: 'If account exists, password reset email has been sent',
        email_masked: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      });
    }

    const user = userResult.rows[0];
    const { token, hash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, hash, expiresAt]
    );

    // TODO: Send email with token (implement email service)
    console.log(`Reset token for ${email}: ${token}`);

    return successResponse(res, {
      message: 'Password reset email sent',
      email_masked: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Request failed', {}, 500);
  }
}

// ============ RESET PASSWORD ============
export async function resetPassword(req, res) {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return sendError(res, 'VALIDATION_ERROR', 'Token and new_password are required');
    }

    if (new_password.length < 8) {
      return sendError(res, 'VALIDATION_ERROR', 'Password must be at least 8 characters');
    }

    const tokenHash = hashToken(token);

    // Find and validate token
    const tokenResult = await db.query(
      `SELECT user_id FROM password_reset_tokens 
       WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return sendError(res, 'BUSINESS_RULE_VIOLATION', 'Token invalid or expired');
    }

    const userId = tokenResult.rows[0].user_id;

    // Update password
    const passwordHash = await bcrypt.hash(new_password, 10);
    await db.query(
      'UPDATE app_users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );

    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
      [tokenHash]
    );

    return successResponse(res, {
      message: 'Password reset successful',
      redirect_to: '/auth/signin',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Reset failed', {}, 500);
  }
}
