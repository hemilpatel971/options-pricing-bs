
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BlackScholesPanel from '../BlackScholesPanel';

// a small helper to mock window.fetch
function mockFetch(responseMap: Record<string, any>) {
  global.fetch = jest.fn((input: string | URL | Request) => {
    // 1) Convert Request or URL to a string URL
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof Request
        ? input.url
        : input.href;

    // 2) Now we can safely split on '?'
    const key = urlStr.split('?')[0];

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(responseMap[key]),
    } as any);
  });
}


describe('BlackScholesPanel', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders inputs and calls API on search', async () => {
    // prepare fake API responses
    mockFetch({
      '/api/bs/spot': { spot: 123.45 },
      '/api/bs/expirations': { expirations: ['2025-07-15'] }
    });

    render(<BlackScholesPanel />);

    // type ticker
    fireEvent.change(screen.getByPlaceholderText('AAPL'), {
      target: { value: 'MSFT' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    // after fetch completes, spot field should update
    await waitFor(() =>
      expect(screen.getByDisplayValue('123.45')).toBeInTheDocument()
    );

    // the expiration dropdown should contain our mock date
    expect(screen.getByRole('combobox')).toHaveValue('2025-07-15');
  });

  it('handles API error gracefully', async () => {
    // simulate a failing spot fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Not found' })
    });

    render(<BlackScholesPanel />);

    fireEvent.change(screen.getByPlaceholderText('AAPL'), {
      target: { value: 'ZZZZ' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() =>
      expect(screen.getByText(/Not found/)).toBeInTheDocument()
    );
  });

});
