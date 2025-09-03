import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner, Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [statusLoading, setStatusLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setAuthorized(false);
        setStatusLoading(false);
        return;
      }
      try {
        const response = await apiService.getUserAccess();
        setAuthorized(response.data?.isAdmin || false);
      } catch (err) {
        console.error(err);
        setAuthorized(false);
      } finally {
        setStatusLoading(false);
      }
    };
    checkUserStatus();
  }, [user]);

  if (loading || statusLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  } else if (user && !authorized) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <span>You are not authorized to access this page!</span>
      </Container>
    );
  }
  return authorized ? children : <Navigate to="/login" replace />;
};

export default AdminRoute;