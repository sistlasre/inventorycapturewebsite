import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { CheckCircleFill, Check2Circle } from 'react-bootstrap-icons';
import pricingData from '../pricing_plans.json';

const ChangePricingPlanModal = ({ 
  show, 
  onHide, 
  currentPlan, 
  onPlanChange,
  isLoading = false,
  subscriptionPages = {}
}) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);

  useEffect(() => {
    // Load pricing data
    setPlans(pricingData);
  }, []);

  useEffect(() => {
    // Update selected plan when currentPlan prop changes
    setSelectedPlan(currentPlan);
  }, [currentPlan]);

  const handlePlanSelect = (planKey) => {
    setSelectedPlan(planKey);
  };

  const handleConfirm = () => {
    if (selectedPlan !== currentPlan) {
      if (subscriptionPages && Object.keys(subscriptionPages).length > 0) {
        window.location.href = subscriptionPages[selectedPlan];
      } else {
        onPlanChange(selectedPlan);
      }
    }
  };

  const getPlanFeatures = (plan) => {
    return [
      `${plan.numAvailableCredits.toLocaleString()} credits included per month`,
      plan.numUsers,
      `Additional credits: ${plan.priceAfterThreshold}`,
    ];
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Change Pricing Plan</Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="py-4">
        <div className="mb-4 text-center">
          <p className="text-muted mb-0">
            Select a new pricing plan. Your current plan is highlighted below.
          </p>
          {currentPlan && (
            <p className="text-muted small">
              Current Plan: <strong>{plans.find(p => p.pricingKey === currentPlan)?.pricingLabel || 'Free'}</strong>
            </p>
          )}
        </div>

        <Row className="g-3">
          {plans.map((plan) => (
            <Col key={plan.pricingKey} lg={3} md={6}>
              <Card 
                className={`h-100 pricing-select-card ${selectedPlan === plan.pricingKey ? 'selected' : ''} ${currentPlan === plan.pricingKey ? 'current-plan' : ''}`}
                onClick={() => handlePlanSelect(plan.pricingKey)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: selectedPlan === plan.pricingKey ? '2px solid #6fa5ff' : '2px solid #E5E7EB',
                  position: 'relative'
                }}
              >
                {/* Current Plan Badge */}
                {currentPlan === plan.pricingKey && (
                  <div className="position-absolute top-0 end-0 p-2">
                    <Badge bg="info" className="small">Current</Badge>
                  </div>
                )}

                {/* Selected Indicator */}
                {selectedPlan === plan.pricingKey && (
                  <div className="position-absolute top-0 start-0 p-2">
                    <Check2Circle className="text-primary" size={24} />
                  </div>
                )}

                <Card.Body className="p-3">
                  {/* Plan Name */}
                  <div className="text-center mb-3">
                    <h5 className="fw-bold mb-2">{plan.pricingLabel}</h5>
                    
                    {/* Price */}
                    <div>
                      {plan.price === 'Free' ? (
                        <div>
                          <span className="h4 fw-bold">Free</span>
                          <div className="text-muted small">Forever</div>
                        </div>
                      ) : (
                        <div>
                          <span className="h5 fw-bold">
                            {plan.price.split('/')[0]}
                          </span>
                          <span className="text-muted small">
                            /{plan.price.split('/')[1]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Credits Badge */}
                    <div className="mt-2">
                      <Badge bg="light" text="dark" className="px-2 py-1">
                        {plan.numAvailableCredits.toLocaleString()} credits
                      </Badge>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="list-unstyled small">
                    {getPlanFeatures(plan).map((feature, index) => (
                      <li key={index} className="mb-2 d-flex align-items-start">
                        <CheckCircleFill 
                          className="text-success me-2 flex-shrink-0 mt-1" 
                          size={14} 
                        />
                        <span className="text-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {selectedPlan !== currentPlan && (
          <div className="mt-4 p-3 bg-light rounded">
            <p className="mb-0 text-center">
              <strong>Note:</strong> Changing from <strong>{plans.find(p => p.pricingKey === currentPlan)?.pricingLabel || 'Free'}</strong> to{' '}
              <strong>{plans.find(p => p.pricingKey === selectedPlan)?.pricingLabel}</strong> will update your available credits to{' '}
              <strong>{plans.find(p => p.pricingKey === selectedPlan)?.numAvailableCredits.toLocaleString()}</strong> credits per month.
            </p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleConfirm}
          disabled={isLoading || selectedPlan === currentPlan}
        >
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Updating...
            </>
          ) : (
            'Confirm Change'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChangePricingPlanModal;
