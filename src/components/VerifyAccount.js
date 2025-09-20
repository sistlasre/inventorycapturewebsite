import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { apiService } from '../services/apiService';

const VerifyAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyAccount = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setVerificationStatus('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        // Send POST request to verify account
        const response = await apiService.verifyUser(token);

        // On success, set status and redirect to login after a short delay
        setVerificationStatus('success');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (error) {
        // Handle error
        setVerificationStatus('error');
        
        // Extract error message from response if available
        if (error.response && error.response.data && error.response.data.message) {
          setErrorMessage(error.response.data.message);
        } else if (error.message) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('There was an error verifying your account. Please try again or contact support.');
        }
      }
    };

    verifyAccount();
  }, [searchParams, navigate]);

  return (
    <Container className="mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          {verificationStatus === 'verifying' && (
            <div className="text-center">
              <Spinner animation="border" role="status" className="mb-3">
                <span className="visually-hidden">Verifying...</span>
              </Spinner>
              <h4>Verifying your account...</h4>
              <p>Please wait while we verify your account.</p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <Alert variant="success">
              <Alert.Heading>Account Verified Successfully!</Alert.Heading>
              <p>
                Your account has been verified. You will be redirected to the login page shortly...
              </p>
            </Alert>
          )}

          {verificationStatus === 'error' && (
            <Alert variant="danger">
              <Alert.Heading>Verification Error</Alert.Heading>
              <p>{errorMessage || 'There was an error verifying your account.'}</p>
              <hr />
              <p className="mb-0">
                Please try again or contact support if the problem persists.
              </p>
            </Alert>
          )}
        </div>
      </div>
    </Container>
  );
};

export default VerifyAccount;