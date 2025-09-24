import React, { useState } from 'react';
import { apiService } from '../services/apiService';

function TariffExplorer() {
  const [country, setCountry] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [tariffCode, setTariffCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!country || (!partNumber && !tariffCode)) {
      setError('Please provide a country and at least one of part number or tariff code.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const params = new URLSearchParams({ coo: country });

    if (partNumber) params.append('part_number', partNumber);
    if (tariffCode) params.append('tariff_code', tariffCode);

    try {
      const response = await apiService.getTariffs(params);
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h2>Tariff Explorer</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Country of Origin *:
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., China"
            style={{ marginLeft: '1rem' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Part Number:
          <input
            type="text"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            placeholder="e.g., ABC123"
            style={{ marginLeft: '2.8rem' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Tariff Code:
          <input
            type="text"
            value={tariffCode}
            onChange={(e) => setTariffCode(e.target.value)}
            placeholder="e.g., 3926.90.99.89"
            style={{ marginLeft: '2.7rem' }}
          />
        </label>
      </div>

      <button onClick={handleSearch}>Calculate Tariffs</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Results:</h3>
          <pre style={{ background: '#f4f4f4', padding: '1rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default TariffExplorer;
