import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faUser } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';

const ForgotPasswordPage = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await apiService.requestPasswordReset(username);
      setSuccess(true);
      // Clear the username after successful request
      setUsername('');
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to send password reset request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">
                <FontAwesomeIcon icon={faKey} className="me-2" />
                Request Password Reset
              </h4>
            </Card.Header>
            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}
              
              {success ? (
                <Alert variant="success">
                  <h5>Password Reset Email Sent!</h5>
                  <p className="mb-2">
                    If an account exists with this username, you will receive an email with 
                    instructions to reset your password.
                  </p>
                  <p className="mb-0">
                    Please check your email and follow the link provided.
                  </p>
                </Alert>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <p className="text-muted mb-4">
                    Enter your username and we'll send you a link to reset your password.
                  </p>
                  
                  <Form.Group className="mb-4">
                    <Form.Label>
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Username
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      required
                      disabled={loading}
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mb-3"
                    disabled={loading || !username.trim()}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Sending Request...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faKey} className="me-2" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </Form>
              )}

              <div className="text-center mt-3">
                <p className="mb-2">
                  Remember your password?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Back to Login
                  </Link>
                </p>
                {!success && (
                  <p className="mb-0">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-decoration-none">
                      Sign up here
                    </Link>
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPasswordPage;
