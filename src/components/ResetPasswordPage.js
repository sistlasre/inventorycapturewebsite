import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faKey, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract token from query parameters
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    
    if (!tokenParam) {
      setError('Invalid or missing password reset token. Please request a new password reset link.');
      return;
    }
    
    setToken(tokenParam);
    
    // Decode username from token
    try {
      const decodedUserInfo = atob(tokenParam);
      setUsername(decodedUserInfo.split('|', 2)[1]);
    } catch (err) {
      console.error('Failed to decode token:', err);
      setError('Invalid password reset token. Please request a new password reset link.');
    }
  }, [location]);

  const validatePassword = () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiService.resetPassword(token, password);
      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to reset password. The link may have expired. Please request a new password reset.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError('');
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
                Reset Your Password
              </h4>
            </Card.Header>
            <Card.Body className="p-4">
              {!token ? (
                <Alert variant="danger">
                  {error || 'Invalid password reset link. Please request a new password reset.'}
                  <div className="mt-3">
                    <Link to="/request-password-reset" className="btn btn-primary btn-sm">
                      Request New Reset Link
                    </Link>
                  </div>
                </Alert>
              ) : success ? (
                <Alert variant="success">
                  <h5>
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Password Reset Successful!
                  </h5>
                  <p className="mb-2">
                    Your password has been successfully reset.
                  </p>
                  <p className="mb-0">
                    You will be redirected to the login page in a moment...
                  </p>
                  <div className="mt-3">
                    <Link to="/login" className="btn btn-primary btn-sm">
                      Go to Login Now
                    </Link>
                  </div>
                </Alert>
              ) : (
                <>
                  {error && (
                    <Alert variant="danger" className="mb-3">
                      {error}
                    </Alert>
                  )}
                  
                  {username && (
                    <Alert variant="info" className="mb-3">
                      Resetting password for user: <strong>{username}</strong>
                    </Alert>
                  )}
                  
                  <Form onSubmit={handleSubmit}>
                    <p className="text-muted mb-4">
                      Enter your new password below. Make sure it's at least 6 characters long.
                    </p>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faLock} className="me-2" />
                        New Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password"
                        required
                        disabled={loading}
                        minLength={6}
                      />
                      <Form.Text className="text-muted">
                        Password must be at least 6 characters long
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>
                        <FontAwesomeIcon icon={faLock} className="me-2" />
                        Confirm New Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        placeholder="Confirm new password"
                        required
                        disabled={loading}
                        minLength={6}
                      />
                    </Form.Group>

                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100 mb-3"
                      disabled={loading || !password || !confirmPassword}
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
                          Resetting Password...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faKey} className="me-2" />
                          Reset Password
                        </>
                      )}
                    </Button>
                  </Form>

                  <div className="text-center">
                    <p className="mb-0">
                      Remember your password?{' '}
                      <Link to="/login" className="text-decoration-none">
                        Back to Login
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPasswordPage;