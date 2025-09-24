// TariffExplorer.js
import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Table, Spinner, Alert } from 'react-bootstrap';
import { apiService } from '../services/apiService';

function TariffExplorer() {
  const [country, setCountry] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [tariffCode, setTariffCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!country || (!partNumber && !tariffCode)) {
      setError('Please provide a country and at least one of part number or tariff code.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const params = new URLSearchParams({ coo: country });
    if (partNumber) params.append('part_no', partNumber);
    if (tariffCode) params.append('tariff_code', tariffCode);

    const url = `https://eadlroekyg.execute-api.us-east-1.amazonaws.com/dev/get_tariffs?${params.toString()}`;

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
    <Container fluid className="py-5 ic-container">
      <Form onSubmit={(e) => handleSearch(e)}>
          <Row className="mb-4">
            <Col md={4}>
              <Form.Group controlId="country">
                <Form.Label>Country of Origin</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., China"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="partNumber">
                <Form.Label>Part Number</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., MK10DN512VLK10"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="tariffCode">
                <Form.Label>Tariff Code</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., 3926.90.99.89"
                  value={tariffCode}
                  onChange={(e) => setTariffCode(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Search'}
              </Button>
            </Col>
          </Row>
      </Form>


      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      {result && (
        <Row>
          <Col>
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="mb-3">Tariff Summary</h5>
                <p><strong>Country:</strong> {result.coo}</p>
                <p><strong>Total Tariff:</strong> {result.total_tariff_pct}%</p>
                <p><strong>Exempt from Reciprocal Tariff:</strong> {result.is_tariff_code_exempt ? 'Yes' : 'No'}</p>

                {/* Applied Tariffs */}
                {result.applied_tariffs && Object.keys(result.applied_tariffs).length > 0 && (
                  <>
                    <h6 className="mt-4 mb-2">Applied Tariffs</h6>
                    <Table bordered hover size="sm">
                      <thead className="table-light">
                        <tr>
                          <th style={{ whiteSpace: 'nowrap' }}>Tariff Type</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Applied Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(result.applied_tariffs).map(([key, value]) => (
                          <tr key={key}>
                            <td>{key}</td>
                            <td>{value}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}

                {/* Headings */}
                {Array.isArray(result.headings) && result.headings.length > 0 && (
                  <>
                    <h6 className="mt-4 mb-2">Headings</h6>
                    <Table bordered hover size="sm">
                      <thead className="table-light">
                        <tr>
                          <th>Heading/Sub-Heading</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.headings.map((heading, idx) => (
                          <tr key={idx}>
                            <td>{heading.htsno}</td>
                            <td>{heading.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default TariffExplorer;
