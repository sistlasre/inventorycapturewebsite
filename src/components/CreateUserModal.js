import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

const CreateUserModal = ({ show, onHide, onUserCreated }) => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setPassword('');
    setUsername('');
    setEmail('');
    setError('');
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Username, email, and password are all required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const userData = {
        username: username.trim(),
        email: email.trim(),
        password: password.trim()
      };

      const response = await apiService.register(username.trim(), password.trim(), email.trim(), user.user_id);

      const createdUser = response.data?.user;

      // Transform the response to match the expected format
      const newUser = {
        user_id: createdUser.sub_account_id,
        username: createdUser.username,
        email: createdUser.email,
        created_at: createdUser.created_at,
        updated_at: createdUser.updated_at,
        user_status: 'active'
      };

      // Call the callback to add the project to the list
      onUserCreated(newUser);
      
      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Failed to create user:', error);
      setError(error.response?.data?.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Create Account
        </Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Username *</Form.Label>
            <Form.Control
              type="text"
              autoComplete="off"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
            <Form.Label>Email *</Form.Label>
            <Form.Control
              type="text"
              autoComplete="off"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
            <Form.Label>Password *</Form.Label>
            <Form.Control
              type="password"
              autoComplete="off"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </Form.Group>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={loading || !username.trim() || !email.trim() || !password.trim()}
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
                Creating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                Create Account
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateUserModal;
