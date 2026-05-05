import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { SessionsNewPage } from '../../src/pages/SessionsNewPage';
import { useAuthStore } from '../../src/store';

// Mock the store
vi.mock('../../src/store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  signin: vi.fn(),
}));

describe('SessionsNewPage (Login)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      signinSuccess: vi.fn(),
      error: null,
      loading: false,
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });

  test('should render login form', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Phone List/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
  });

  test('should have email input', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText(/you@example.com/);
    expect(emailInput).toBeInTheDocument();
  });

  test('should have password input', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const passwordInput = screen.getByPlaceholderText(/••••••••/);
    expect(passwordInput).toBeInTheDocument();
  });

  test('should have sign in button', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /Sign In/ });
    expect(signInButton).toBeInTheDocument();
  });

  test('should have link to signup page', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const signupLink = screen.getByRole('link', { name: /Sign up/ });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/users/new');
  });

  test('should have forgot password link', () => {
    render(
      <BrowserRouter>
        <SessionsNewPage />
      </BrowserRouter>
    );

    const forgotLink = screen.getByRole('link', { name: /Forgot password/ });
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute('href', '/users/password');
  });
});
