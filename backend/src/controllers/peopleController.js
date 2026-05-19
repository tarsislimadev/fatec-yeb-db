import { db } from '../db/index.js';
import { successResponse, sendError } from '../utils/response.js';
import { v4 as uuidv4 } from 'uuid';
import { normalizeDocument, normalizeEmail, normalizeName } from '../utils/normalize.js';

// ============ LIST PEOPLE ============
export async function listPeople(req, res) {
  try {
    const result = await db.query('SELECT id, full_name, role_title, email FROM people WHERE deleted_at IS NULL');
    return successResponse(res, { people: result.rows });
  } catch (error) {
    console.error('Error listing People:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'An error occurred while retrieving People');
  }
}

// ============ CREATE PEOPLE ============
export async function createPerson(req, res) {
  try {
    const { full_name, role_title, email, document } = req.body;

    // Validate input
    if (!full_name || !email) {
      return sendError(res, 'VALIDATION_ERROR', 'Full name and email are required');
    }

    const normalizedName = normalizeName(full_name);
    const normalizedEmail = normalizeEmail(email);
    const normalizedDocument = normalizeDocument(document || '');

    if (!normalizedName) {
      return sendError(res, 'VALIDATION_ERROR', 'Full name is required');
    }

    if (!normalizedEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Email is required');
    }

    // Check for duplicate email
    const existingResult = await db.query(
      'SELECT id FROM people WHERE email_normalized = $1 AND deleted_at IS NULL',
      [normalizedEmail]
    );
    if (existingResult.rows.length > 0) {
      return sendError(res, 'CONFLICT', 'Email already exists', {}, 409);
    }

    if (normalizedDocument) {
      const documentResult = await db.query(
        'SELECT id FROM people WHERE document_normalized = $1 AND deleted_at IS NULL',
        [normalizedDocument]
      );

      if (documentResult.rows.length > 0) {
        return sendError(res, 'CONFLICT', 'Document already exists', {}, 409);
      }
    }

    // Create person
    const personId = uuidv4();
    const result = await db.query(
      `INSERT INTO people (
        id,
        full_name,
        full_name_normalized,
        role_title,
        email,
        email_normalized,
        document,
        document_normalized
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, full_name, role_title, email`,
      [
        personId,
        full_name,
        normalizedName,
        role_title,
        email,
        normalizedEmail,
        document || null,
        normalizedDocument,
      ]
    );

    return successResponse(res, { person: result.rows[0] }, 201);
  } catch (error) {
    console.error('Error creating Person:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'An error occurred while creating the Person');
  }
}

// ============ GET PEOPLE DETAIL ============
export async function getPerson(req, res) {
  try {
    const id = req.params.id == 'me' ? req.user.id : req.params.id;

    console.log('Getting Person with ID:', id);

    const result = await db.query('SELECT id, full_name, role_title, email FROM people WHERE id = $1 AND deleted_at IS NULL', [id]);

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Person not found', {}, 404);
    }

    return successResponse(res, { person: result.rows[0] });
  } catch (error) {
    console.error('Error retrieving Person:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'An error occurred while retrieving the Person');
  }
}

// ============ UPDATE PEOPLE ============
export async function updatePerson(req, res) {
  try {
    const { id } = req.params;
    const { full_name, role_title, email, document } = req.body;

    // Validate input
    if (!full_name && !email && !role_title && !document) {
      return sendError(res, 'VALIDATION_ERROR', 'At least one field must be provided');
    }

    // Check if person exists
    const existingResult = await db.query('SELECT id FROM people WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existingResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Person not found', {}, 404);
    }

    // Check for duplicate email if email is being updated
    let normalizedEmail = null;
    if (email) {
      normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Email is required');
      }

      const emailResult = await db.query(
        'SELECT id FROM people WHERE email_normalized = $1 AND id != $2 AND deleted_at IS NULL',
        [normalizedEmail, id]
      );
      if (emailResult.rows.length > 0) {
        return sendError(res, 'CONFLICT', 'Email already exists', {}, 409);
      }
    }

    let normalizedDocument = null;
    if (document !== undefined) {
      normalizedDocument = normalizeDocument(document || '');
      if (normalizedDocument) {
        const documentResult = await db.query(
          'SELECT id FROM people WHERE document_normalized = $1 AND id != $2 AND deleted_at IS NULL',
          [normalizedDocument, id]
        );

        if (documentResult.rows.length > 0) {
          return sendError(res, 'CONFLICT', 'Document already exists', {}, 409);
        }
      }
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name) {
      const normalizedName = normalizeName(full_name);
      if (!normalizedName) {
        return sendError(res, 'VALIDATION_ERROR', 'Full name is required');
      }

      fields.push(`full_name = $${idx++}`);
      values.push(full_name);
      fields.push(`full_name_normalized = $${idx++}`);
      values.push(normalizedName);
    }
    if (role_title) {
      fields.push(`role_title = $${idx++}`);
      values.push(role_title);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email);
      fields.push(`email_normalized = $${idx++}`);
      values.push(normalizedEmail);
    }
    if (document !== undefined) {
      fields.push(`document = $${idx++}`);
      values.push(document || null);
      fields.push(`document_normalized = $${idx++}`);
      values.push(normalizedDocument);
    }
    values.push(id); // For WHERE clause

    const query = `UPDATE people SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING id, full_name, role_title, email`;
    const result = await db.query(query, values);

    return successResponse(res, { person: result.rows[0] });
  } catch (error) {
    console.error('Error updating Person:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'An error occurred while updating the Person');
  }
}

// ============ DELETE PEOPLE (SOFT DELETE) ============
export async function deletePerson(req, res) {
  try {
    const { id } = req.params;

    // Check if person exists
    const existingResult = await db.query('SELECT id FROM people WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existingResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Person not found', {}, 404);
    }

    // Soft delete by setting deleted_at
    await db.query('UPDATE people SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    return successResponse(res, {});
  } catch (error) {
    console.error('Error deleting Person:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'An error occurred while deleting the Person');
  }
}
