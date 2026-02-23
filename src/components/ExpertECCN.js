import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import DetermineECCN from './DetermineECCN';

const ExpertECCN = () => {
  return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col className="text-center">
          <h1>Expert ECCN Tool</h1>
        </Col>
      </Row>
      <div className="border-bottom pb-5 mb-5">
        <DetermineECCN />
      </div>
    </Container>
  );
};

export default ExpertECCN;
