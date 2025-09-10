import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { CheckCircleFill } from 'react-bootstrap-icons';
import pricingData from '../pricing_plans.json';

const Pricing = () => {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    // Load pricing data
    setPlans(pricingData);
  }, []);

  const getPlanFeatures = (plan) => {
    // Only show the features that are in the JSON data
    return [
      `${plan.numAvailableCredits.toLocaleString()} credits included per month`,
      plan.numUsers,
      `Additional credits: ${plan.priceAfterThreshold}`,
    ];
  };

  return (
    <Container className="py-5">
      {/* Header Section */}
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold mb-3">Choose Your Plan</h1>
        <p className="lead text-muted">
          Select the perfect plan for your inventory management needs
        </p>
      </div>

      {/* Pricing Cards */}
      <Row className="g-4 justify-content-center">
        {plans.map((plan) => (
          <Col key={plan.pricingKey} lg={3} md={6}>
            <Card className="h-100 pricing-card">
              <Card.Body className="d-flex flex-column p-4">
                {/* Plan Name */}
                <div className="text-center mb-4">
                  <h3 className="fw-bold">{plan.pricingLabel}</h3>
                  
                  {/* Price */}
                  <div className="mt-3">
                    {plan.price === 'Free' ? (
                      <div>
                        <span className="display-4 fw-bold">Free</span>
                      </div>
                    ) : (
                      <div>
                        <span className="display-5 fw-bold">
                          {plan.price.split('/')[0]}
                        </span>
                        <span className="text-muted">
                          /{plan.price.split('/')[1]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Credits Info Badge */}
                  <div className="mt-3">
                    <Badge bg="light" text="dark" className="px-3 py-2">
                      {plan.numAvailableCredits.toLocaleString()} credits/month
                    </Badge>
                  </div>
                </div>

                {/* Features List */}
                <div className="flex-grow-1">
                  <ul className="list-unstyled">
                    {getPlanFeatures(plan).map((feature, index) => (
                      <li key={index} className="mb-3 d-flex align-items-start">
                        <CheckCircleFill 
                          className="text-success me-2 flex-shrink-0 mt-1" 
                          size={16} 
                        />
                        <span className="text-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Additional Information Section */}
    </Container>
  );
};

export default Pricing;
