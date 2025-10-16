import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import ComponentSearchBar from './ComponentSearchBar';

const ComponentLocator = () => {
  return (
    <Container fluid className="py-5">
      <Row className="min-vh-50 d-flex align-items-center justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="shadow-lg border-0">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h1 className="display-5 mb-3">Component Locator</h1>
                <p className="text-muted">
                  Search for electronic components by MPN or Manufacturer
                </p>
              </div>

              <ComponentSearchBar 
                showDropdown={true}
                placeholder="Enter MPN or Manufacturer name..."
              />

              <div className="mt-4 text-center">
                <small className="text-muted">
                  Search through millions of electronic components with real-time pricing and availability
                </small>
              </div>
            </Card.Body>
          </Card>

          {/* Quick stats or features */}
          <Row className="mt-5">
            <Col className="text-center mb-3">
              <div className="p-3">
                <h5 className="text-primary">🔍</h5>
                <h6>Exact or Prefix Match</h6>
                <small className="text-muted">Find specific components by MPN or Manufacturer</small>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default ComponentLocator;
