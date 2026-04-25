import { db } from '../db/index.js';
import { successResponse, sendError } from '../utils/response.js';
import { v4 as uuidv4 } from 'uuid';

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
    const { full_name, role_title, email } = req.body;

    // Validate input
    if (!full_name || !email) {
      return sendError(res, 'VALIDATION_ERROR', 'Full name and email are required');
    }

    // Check for duplicate email
    const existingResult = await db.query('SELECT id FROM people WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (existingResult.rows.length > 0) {
      return sendError(res, 'CONFLICT', 'Email already exists', {}, 409);
    }

    // Create person
    const personId = uuidv4();
    const result = await db.query(
      'INSERT INTO people (id, full_name, role_title, email) VALUES ($1, $2, $3, $4) RETURNING id, full_name, role_title, email',
      [personId, full_name, role_title, email]
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
    const { full_name, role_title, email } = req.body;

    // Validate input
    if (!full_name && !email) {
      return sendError(res, 'VALIDATION_ERROR', 'At least one of full_name or email must be provided');
    }

    // Check if person exists
    const existingResult = await db.query('SELECT id FROM people WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existingResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Person not found', {}, 404);
    }

    // Check for duplicate email if email is being updated
    if (email) {
      const emailResult = await db.query('SELECT id FROM people WHERE email = $1 AND id != $2 AND deleted_at IS NULL', [email, id]);
      if (emailResult.rows.length > 0) {
        return sendError(res, 'CONFLICT', 'Email already exists', {}, 409);
      }
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name) {
      fields.push(`full_name = $${idx++}`);
      values.push(full_name);
    }
    if (role_title) {
      fields.push(`role_title = $${idx++}`);
      values.push(role_title);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email);
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
