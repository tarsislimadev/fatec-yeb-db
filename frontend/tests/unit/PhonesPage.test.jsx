import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import PhonesPage from '../PhonesPage';
import { usePhoneStore, useAuthStore } from '../../store';

vi.mock('../../store', () => ({
  usePhoneStore: vi.fn(),
  useAuthStore: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: {
    getPhones: vi.fn(),
    createPhone: vi.fn(),
  },
}));

describe('PhonesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      token: 'valid-token',
      user: { id: '1' },
    });
    usePhoneStore.mockReturnValue({
      phones: [
        { id: '1', e164_number: '+5511999887766', raw_number: '(11) 99988-7766', phone_type: 'mobile', status: 'active' },
        { id: '2', e164_number: '+5511988776655', raw_number: '(11) 98877-6655', phone_type: 'landline', status: 'active' },
      ],
      loading: false,
      error: null,
      createPhone: vi.fn(),
      fetchPhones: vi.fn(),
    });
  });

  test('should render phone list', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/phones/i)).toBeInTheDocument();
    expect(screen.getByText(/99988-7766/)).toBeInTheDocument();
  });

  test('should show loading state', () => {
    usePhoneStore.mockReturnValue({
      phones: [],
      loading: true,
      error: null,
    });

    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('should display error message', () => {
    usePhoneStore.mockReturnValue({
      phones: [],
      loading: false,
      error: 'Failed to load phones',
    });

    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
  });

  test('should have search input', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('should have filter dropdown', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    const filterSelect = screen.getByLabelText(/filter|status/i);
    expect(filterSelect).toBeInTheDocument();
  });

  test('should have add phone button', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    const addButton = screen.getByRole('button', { name: /add|create|new/i });
    expect(addButton).toBeInTheDocument();
  });

  test('should navigate to phone detail on click', () => {
    render(
      <BrowserRouter>
        <PhonesPage />
      </BrowserRouter>
    );

    const phoneCard = screen.getByText(/99988-7766/);
    fireEvent.click(phoneCard);
    // Navigation would be verified with react-router testing utils
  });
});
