import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert, Badge, Button } from 'react-bootstrap';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortAsc, faSortDesc, faArrowLeft, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import ComponentSearchBar from './ComponentSearchBar';

const ComponentSearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const searchType = queryParams.get('search_type') || 'exact';
  const field = queryParams.get('field') || 'mpn';
  const fieldValue = queryParams.get('field_value') || '';

  // Perform search when component mounts or query params change
  useEffect(() => {
    if (fieldValue && fieldValue.length >= 3) {
      performSearch();
    }
  }, [location.search]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://emev1efipj.execute-api.us-east-1.amazonaws.com/prod/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          search_type: searchType,
          search_source: 'search_page',
          field: field,
          field_value: fieldValue
        })
      });

      const data = await response.json();

      if (data.items) {
        // Parse the item strings
        const parsedItems = data.items.map(item => {
          try {
            return JSON.parse(item.item);
          } catch (e) {
            console.error('Error parsing item:', e);
            return null;
          }
        }).filter(item => item !== null);

        setResults(parsedItems);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = (newValue, newSearchType, newField) => {
    const params = new URLSearchParams({
      search_type: newSearchType,
      field: newField,
      field_value: newValue
    });
    navigate(`/component_locator/search?${params.toString()}`);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sorted = [...results].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      // Handle numeric values
      if (key === 'in_stock' || key.includes('price') || key.includes('qty')) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setSortConfig({ key, direction });
    setResults(sorted);
  };

  const formatPrice = (price) => {
    return price > 0 ? `$${parseFloat(price).toFixed(2)}` : '-';
  };

  const formatQuantity = (qty) => {
    return qty > 0 ? qty.toLocaleString() : '-';
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <FontAwesomeIcon icon={faSort} className="ms-1" style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc' 
      ? <FontAwesomeIcon icon={faSortAsc} className="ms-1" />
      : <FontAwesomeIcon icon={faSortDesc} className="ms-1" />;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-3">
            <Button 
              variant="link" 
              onClick={() => navigate('/component_locator')}
              className="ps-0"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
              Back to Component Locator
            </Button>
          </div>

          <h2 className="mb-3">Component Search Results</h2>

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <ComponentSearchBar 
                showDropdown={true}
                onSearch={handleNewSearch}
                initialValue={fieldValue}
                searchType={searchType}
                field={field}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {loading && (
        <Row>
          <Col className="text-center py-5">
            <Spinner animation="border" role="status" className="mb-3" />
            <p>Searching for components...</p>
          </Col>
        </Row>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!loading && !error && results.length === 0 && fieldValue && (
        <Alert variant="info">
          No results found for "{fieldValue}". Try adjusting your search criteria.
        </Alert>
      )}

      {!loading && results.length > 0 && (
        <>
          <Row className="mb-3">
            <Col>
              <div className="d-flex justify-content-between align-items-center">
                <h5>
                  Found {results.length} result{results.length !== 1 ? 's' : ''} for "{fieldValue}"
                </h5>
                <Badge bg="secondary">{field.toUpperCase()} - {searchType.replace('_', ' ').toUpperCase()}</Badge>
              </div>
            </Col>
          </Row>

          <Row>
            <Col>
              <Card className="shadow-sm">
                <Card.Body style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <Table striped hover className="mb-0">
                      <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th onClick={() => handleSort('mpn')} style={{ cursor: 'pointer' }}>
                            MPN {getSortIcon('mpn')}
                          </th>
                          <th onClick={() => handleSort('manufacturer')} style={{ cursor: 'pointer' }}>
                            Manufacturer {getSortIcon('manufacturer')}
                          </th>
                          <th onClick={() => handleSort('dc')} style={{ cursor: 'pointer' }}>
                            Date Code {getSortIcon('dc')}
                          </th>
                          <th onClick={() => handleSort('in_stock')} style={{ cursor: 'pointer' }}>
                            Stock {getSortIcon('in_stock')}
                          </th>
                          <th>Qty 1</th>
                          <th>Qty 10</th>
                          <th>Qty 100</th>
                          <th>Qty 1K</th>
                          <th>Qty 10K</th>
                          <th>Description</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((item, index) => (
                          <tr key={index}>
                            <td className="fw-bold">{item.mpn}</td>
                            <td>{item.manufacturer}</td>
                            <td>
                              {item.dc !== 'nan' && item.dc !== 'NaN' ? (
                                <Badge bg="info">{item.dc}</Badge>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              {item.in_stock > 0 ? (
                                <Badge bg={item.in_stock > 100 ? 'success' : 'warning'}>
                                  {formatQuantity(item.in_stock)}
                                </Badge>
                              ) : (
                                <Badge bg="danger">Out of Stock</Badge>
                              )}
                            </td>
                            <td>{formatPrice(item.price_a)}</td>
                            <td>{formatPrice(item.price_b)}</td>
                            <td>{formatPrice(item.price_c)}</td>
                            <td>{formatPrice(item.price_d)}</td>
                            <td>{formatPrice(item.price_e)}</td>
                            <td>
                              {item.description && item.description !== 'NaN' && item.description !== 'nan' ? (
                                <small className="text-muted">{item.description.substring(0, 50)}...</small>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              {item.link && (
                                <a 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary"
                                  title="View on component search"
                                >
                                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Pricing breakdown legend */}
          <Row className="mt-3">
            <Col>
              <Card className="bg-light">
                <Card.Body>
                  <h6>Pricing Tiers:</h6>
                  <small className="text-muted">
                    <span className="me-3">Qty 1: 1+ units</span>
                    <span className="me-3">Qty 10: 10+ units</span>
                    <span className="me-3">Qty 100: 100+ units</span>
                    <span className="me-3">Qty 1K: 1,000+ units</span>
                    <span>Qty 10K: 10,000+ units</span>
                  </small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default ComponentSearchResults;
