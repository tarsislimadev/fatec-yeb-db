import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import SessionsNewPage from '../SessionsNewPage';
import { useAuthStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useAuthStore: vi.fn(),
}));

describe('SessionsNewPage (Login)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      signin: vi.fn().mockResolvedValue(true),
      error: null,
      loading: false,
    });
  });

  test('should render login form', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/sign in|login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('should submit login form with valid data', async () => {
    const mockSignin = vi.fn().mockResolvedValue(true);
    useAuthStore.mockReturnValue({
      signin: mockSignin,
      error: null,
      loading: false,
    });

    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in|login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignin).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!'
      );
    });
  });

  test('should display error message on failed login', async () => {
    useAuthStore.mockReturnValue({
      signin: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
      error: 'Invalid credentials',
      loading: false,
    });

    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /sign in|login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error|invalid|credentials/i)).toBeInTheDocument();
    });
  });

  test('should have link to signup page', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const signupLink = screen.getByRole('link', { name: /sign up|create account/i });
    expect(signupLink).toBeInTheDocument();
  });
});
