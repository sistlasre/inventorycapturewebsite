import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import DetermineECCN from './DetermineECCN';
import LicensingRequirements from './LicensingRequirements';

const ExpertECCN = () => {
  const [eccnForLicensing, setEccnForLicensing] = useState('');

  return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col className="text-center">
          <h1>Expert ECCN Tool</h1>
        </Col>
      </Row>
      <div className="border-bottom pb-5 mb-5">
        <DetermineECCN setEccnForLicensing={setEccnForLicensing} />
      </div>
      <div>
        <LicensingRequirements eccn={eccnForLicensing} setEccn={setEccnForLicensing} />
      </div>
    </Container>
  );
};

export default ExpertECCN;
