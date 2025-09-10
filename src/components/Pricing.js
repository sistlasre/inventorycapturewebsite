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
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col md={12}>
            <h3 className="text-center mb-4">Frequently Asked Questions</h3>
          </Col>
          <Col md={6} className="mb-4">
            <h5>What are credits?</h5>
            <p className="text-muted">
              Credits are used for inventory captures and processing. Each scan or capture operation 
              consumes one credit. Additional credits can be purchased as needed.
            </p>
          </Col>
          <Col md={6} className="mb-4">
            <h5>Can I change plans anytime?</h5>
            <p className="text-muted">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the 
              start of your next billing cycle.
            </p>
          </Col>
          <Col md={6} className="mb-4">
            <h5>What happens if I run out of credits?</h5>
            <p className="text-muted">
              You can purchase additional credits at the rates shown for each plan. The per-credit 
              price decreases with higher-tier plans.
            </p>
          </Col>
          <Col md={6} className="mb-4">
            <h5>Do unused credits roll over?</h5>
            <p className="text-muted">
              Credits reset each billing cycle and do not roll over. We recommend choosing a plan 
              that matches your typical monthly usage.
            </p>
          </Col>
        </Row>

        {/* Contact Section */}
        <div className="text-center mt-5 p-4 bg-light rounded">
          <h4>Need a Custom Plan?</h4>
          <p className="text-muted">
            For enterprise needs or custom requirements, please contact our sales team for more information.
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Pricing;
