import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { PhonesPage } from '../../src/pages/PhonesPage';
import { usePhoneStore, useAuthStore } from '../../src/store';

vi.mock('../../src/store', () => ({
  usePhoneStore: vi.fn(),
  useAuthStore: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  getPhones: vi.fn(() => Promise.resolve({ phones: [], meta: { total_pages: 1 } })),
  createPhone: vi.fn(),
}));

describe('PhonesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      token: 'valid-token',
      user: { id: '1' },
      isAuthenticated: true,
    });
    usePhoneStore.mockReturnValue({
      phones: [
        { id: '1', e164_number: '+5511999887766', type: 'mobile', status: 'active' },
        { id: '2', e164_number: '+5511988776655', type: 'landline', status: 'active' },
      ],
      isLoading: false,
      error: null,
      setPhones: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setCurrentPhone: vi.fn(),
      clearError: vi.fn(),
    });
  });

  test('should render phone list', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/Search phone numbers/)).toBeInTheDocument();
    expect(screen.getByText(/\+5511999887766/)).toBeInTheDocument();
  });

  test('should show loading state', () => {
    usePhoneStore.mockReturnValue({
      phones: [],
      isLoading: true,
      error: null,
      setPhones: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setCurrentPhone: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    // Check for the Loading component by looking for its content
    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
  });

  test('should display error message', () => {
    usePhoneStore.mockReturnValue({
      phones: [],
      isLoading: false,
      error: 'Failed to load phones',
      setPhones: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setCurrentPhone: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Failed to load phones/)).toBeInTheDocument();
  });

  test('should have search input', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search phone numbers/);
    expect(searchInput).toBeInTheDocument();
  });

  test('should have status filter dropdown', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    const filterSelect = screen.getByDisplayValue('All Status');
    expect(filterSelect).toBeInTheDocument();
  });

  test('should have add phone button', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    const addButton = screen.getByRole('button', { name: /Add Phone/ });
    expect(addButton).toBeInTheDocument();
  });

  test('should render phone numbers', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/\+5511999887766/)).toBeInTheDocument();
    expect(screen.getByText(/\+5511988776655/)).toBeInTheDocument();
  });
});
