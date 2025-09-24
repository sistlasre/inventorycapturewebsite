// TariffExplorer.js
import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Table, Spinner, Alert } from 'react-bootstrap';
import { apiService } from '../services/apiService';
import Select from 'react-select';
import countryList from '../country_list.json';

function TariffExplorer() {
  const [country, setCountry] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [tariffCode, setTariffCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const countryOptions = countryList.map((c) => ({ value: c, label: c }));
  const TARIFF_TYPE_TO_TEXT = {
    "general": "General Tariff",
    "reciprocal": "Country Specific Reciprocal Tariff",
    "ad_valorem": "Country Specific Ad Valorem Tariff",
    "chinese": "Section 301 Tariff",
  };

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

    try {
      const response = await apiService.getTariffs(params);
      setResult(response.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong');
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
                  <Form.Label>Country of Origin <span className="text-danger">*</span></Form.Label>
                  <Select
                    options={countryOptions}
                    value={countryOptions.find((opt) => opt.value === country)}
                    onChange={(selected) => setCountry(selected ? selected.value : '')}
                    placeholder="Select a country"
                    isClearable
                  />
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group>
                <div className="text-center mb-0">
                <Form.Label className="fw-bold">
                  Tariff Code <span className="text-muted">or</span> Part Number <span className="text-danger">*</span>
                </Form.Label>
                </div>
                <Row className="align-items-center text-center">
                  <Col xs={12} md={5}>
                    <Form.Control
                      type="text"
                      placeholder="Tariff Code (e.g., 3926.90.99.89)"
                      value={tariffCode}
                      onChange={(e) => setTariffCode(e.target.value)}
                    />
                  </Col>
                  <Col xs={12} md={1} className="my-2 my-md-0">
                    <strong>OR</strong>
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Control
                      type="text"
                      placeholder="Part Number (e.g., MK10DN512VLK10)"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                    />
                  </Col>
                </Row>
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

      {/* Canada/Mexico */}
      {result && (result.coo == 'Mexico' || result.coo == 'Canada') && (
          <Row className="mt-4">
            <Col>
              <Alert variant="warning" className="small">
                The United States and {result.coo} are members of the USMCA trade agreement. As such, the part listed <strong>may</strong> be exempt from tariffs. We strongly advise you to consult with a licensed customs broker or trade professional before making any financial decisions.
              </Alert>
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
                <p><strong>Tariff Code:</strong> {result.tariff_code}</p>
                <p><strong>Part Number:</strong> {result.part_no}</p>
                <p><strong>Exempt from Reciprocal Tariff:</strong> {result.is_tariff_code_exempt ? 'Yes' : 'No'}</p>
                <p><strong>Total Tariff:</strong> {result.total_tariff_pct}%</p>

                {/* Applied Tariffs */}
                {result.applied_tariffs && Object.keys(result.applied_tariffs).length > 0 && (
                  <>
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
                            <td>{TARIFF_TYPE_TO_TEXT[key]}</td>
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
      {/* DISCLAIMER MESSAGE */}
      <Row className="mt-4">
        <Col>
          <Alert variant="warning" className="small">
            <strong>For Estimation Purposes Only:</strong> This tariff calculator is intended for informational purposes and should be used as a general guide only. The calculations are estimates and are not a substitute for official or binding determinations. We cannot and do not provide any more information or guidance than what this tool provides. We do not guarantee the accuracy of the results and strongly advise you to consult with a licensed customs broker or trade professional before making any financial decisions.
          </Alert>
        </Col>
      </Row>
    </Container>
  );
}

export default TariffExplorer;
