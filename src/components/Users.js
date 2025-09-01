import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Spinner, Alert, Button, Badge, Toast, ToastContainer, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUser, faCheck, faTimes, faEdit } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import CreateUserModal from './CreateUserModal';

const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/gi, "");

const Users = ({ pageHeader }) => {
  const { parentUser } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = React.useState(false);

  // filter + sort states
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('date-newest');

  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [editActive, setEditActive] = useState(false);
  const [originalActive, setOriginalActive] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getUsers(parentUser);
      setUsers(response.data?.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user) => {
    setEditingUser(user.user_id);
    setEditPassword('');
    setEditActive(!user.user_status || user.user_status == 'active');
    setOriginalActive(!user.user_status || user.user_status == 'active');
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditPassword('');
    setEditActive(false);
    setOriginalActive(false);
  };

  const saveUserChanges = async (userId) => {
    try {
      const payload = {};
      if (editPassword.trim()) {
        payload.new_password = editPassword.trim();
      }
      if (editActive !== originalActive) {
        payload.new_status = editActive ? 'active' : 'inactive';
      }

      if (Object.keys(payload).length === 0) {
        // Nothing changed
        cancelEditing();
        return;
      }

      setActionLoading(userId);
      await apiService.updateUser(userId, payload);

      // Update local state only with changed fields
      setUsers(users.map(u =>
        u.user_id === userId
          ? { ...u, ...(payload.new_status !== undefined ? { user_status: payload.new_status } : {}) }
          : u
      ));

      setToastMessage('User updated successfully.');
      setShowToast(true);
      cancelEditing();
    } catch (err) {
      console.error('Failed to update user:', err);
      setToastMessage('Failed to update user. Please try again.');
      setShowToast(true);
    } finally {
      setActionLoading(null);
    }
  };

  // Function to handle project creation
  const handleUserCreated = (newUser) => {
    setUsers([newUser, ...users]);
  };

  useEffect(() => {
    fetchUsers();
  }, [parentUser]);

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
          <h1 className="text-center">{pageHeader}</h1>
        </Col>
      </Row>

      {/* Controls */}
      <Row className="mb-3">
        <Col>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <InputGroup style={{ maxWidth: '400px' }}>
            <Form.Select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="username-asc">Username (A → Z)</option>
              <option value="username-desc">Username (Z → A)</option>
              <option value="date-newest">Date Created (Newest)</option>
              <option value="date-oldest">Date Created (Oldest)</option>
            </Form.Select>
            <Form.Control
              type="text"
              placeholder="Filter by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          {parentUser && (
              <Button variant="primary" onClick={() => setShowCreateUserModal(true)}>
                <FontAwesomeIcon icon={faPlus} className="me-2" /> Create Sub Account
              </Button>
          )}
        </div>
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
                <Card.Body>
                  {editingUser === user.user_id ? (
                    <>
                      <h5 className="mb-3">Editing {user.username}</h5>
                      <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={editPassword}
                          placeholder="Enter new password"
                          onChange={(e) => setEditPassword(e.target.value)}
                          disabled={actionLoading === user.user_id}
                        />
                      </Form.Group>
                      <Form.Group className="mb-3 d-flex align-items-center">
                        <Form.Check
                          type="switch"
                          id={`active-switch-${user.user_id}`}
                          label={editActive ? 'Active' : 'Inactive'}
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          disabled={actionLoading === user.user_id}
                        />
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button
                          variant="success"
                          onClick={() => saveUserChanges(user.user_id)}
                          disabled={actionLoading === user.user_id}
                        >
                          {actionLoading === user.user_id ? (
                            <Spinner as="span" animation="border" size="sm" />
                          ) : (
                            <FontAwesomeIcon icon={faCheck} className="me-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={cancelEditing}
                          disabled={actionLoading === user.user_id}
                        >
                          <FontAwesomeIcon icon={faTimes} className="me-1" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-1">{user.username}</h5>
                        <p className="mb-0 text-muted small">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                        <Badge bg={user.active ? "success" : "secondary"} className="mt-2">
                          {user.user_status && user.user_status == 'inactive' ? 'Inactive' : 'Active'}
                        </Badge>
                      </div>
                      <Button
                        variant="outline-primary"
                        onClick={() => startEditing(user)}
                      >
                        <FontAwesomeIcon icon={faEdit} className="me-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))
          )}
        </Col>
      </Row>

      {/* Create Project Modal */}
      <CreateUserModal
        show={showCreateUserModal}
        onHide={() => setShowCreateUserModal(false)}
        onUserCreated={handleUserCreated}
      />
      
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
