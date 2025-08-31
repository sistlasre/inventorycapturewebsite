import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button, Badge, Toast, ToastContainer, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';

const API_BASE_URL = 'https://eadlroekyg.execute-api.us-east-1.amazonaws.com/dev';

const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/gi, "");

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // filter + sort states
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('username-asc');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getUsers();
      setUsers(response.data?.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      setActionLoading(userId);
      await apiService.put(`${API_BASE_URL}/users/${userId}`, {
        active: !isActive
      });

      setUsers(users.map(u =>
        u.user_id === userId ? { ...u, active: !isActive } : u
      ));

      setToastMessage(`User ${!isActive ? 'activated' : 'deactivated'} successfully.`);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update user:', err);
      setToastMessage('Failed to update user. Please try again.');
      setShowToast(true);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // filter + sort processing
  const processedUsers = useMemo(() => {
    let result = [...users];

    // filter by username
    if (search.trim()) {
      const normalizedSearch = normalize(search);
      result = result.filter(u => normalize(u.username).includes(normalizedSearch));
    }

    // sort
    result.sort((a, b) => {
      if (sortOption.startsWith('username')) {
        const nameA = normalize(a.username);
        const nameB = normalize(b.username);
        return sortOption === 'username-asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else if (sortOption.startsWith('date')) {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return sortOption === 'date-newest'
          ? dateB - dateA
          : dateA - dateB;
      }
      return 0;
    });

    return result;
  }, [users, search, sortOption]);

  return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Users</h1>
        </Col>
      </Row>

      {/* Controls */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Filter by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={6}>
          <Form.Select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="username-asc">Sort by Username (A → Z)</option>
            <option value="username-desc">Sort by Username (Z → A)</option>
            <option value="date-newest">Sort by Date Created (Newest)</option>
            <option value="date-oldest">Sort by Date Created (Oldest)</option>
          </Form.Select>
        </Col>
      </Row>

      <Row>
        <Col>
          {error && (
            <Alert variant="danger" className="mb-3">{error}</Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
              <p className="mt-3">Loading users...</p>
            </div>
          ) : processedUsers.length === 0 ? (
            <Card className="mb-2">
              <Card.Body className="text-center py-5">
                <FontAwesomeIcon icon={faUser} size="3x" className="text-muted mb-3" />
                <h6 className="text-muted">No users found</h6>
              </Card.Body>
            </Card>
          ) : (
            processedUsers.map(user => (
              <Card key={user.user_id} className="mb-3 shadow-sm">
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">{user.username}</h5>
                    <p className="mb-0 text-muted small">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                    <Badge bg={user.active ? "success" : "secondary"} className="mt-2">
                      {user.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <Button
                    variant={user.active ? "outline-danger" : "outline-success"}
                    onClick={() => toggleUserStatus(user.user_id, user.active)}
                    disabled={actionLoading === user.user_id}
                  >
                    {actionLoading === user.user_id ? (
                      <Spinner as="span" animation="border" size="sm" />
                    ) : (
                      <FontAwesomeIcon icon={user.active ? faTimes : faCheck} />
                    )}
                    {user.active ? ' Deactivate' : ' Activate'}
                  </Button>
                </Card.Body>
              </Card>
            ))
          )}
        </Col>
      </Row>

      {/* Toast Notifications */}
      <ToastContainer className="p-3" position="top-end">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={4000}
          autohide
          bg={toastMessage?.includes('successfully') ? "success" : "danger"}
        >
          <Toast.Header>
            <strong className="me-auto">{toastMessage?.includes('successfully') ? 'Success' : 'Error'}</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default Users;
