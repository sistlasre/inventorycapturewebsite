import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Button,
  Badge,
  Toast,
  ToastContainer,
  Form,
  InputGroup,
  Table
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faUser,
  faCheck,
  faTimes,
  faEdit,
  faChevronDown,
  faChevronRight,
  faTrash,
  faPencil,
  faSort,
  faSortAsc,
  faSortDesc
} from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import CreateUserModal from './CreateUserModal';

const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/gi, "");

const Users = ({ pageHeader, showNumCredits = false }) => {
  const { parentUser } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // filter + sort states
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filterField, setFilterField] = useState('all');

  // editing states - now stores multiple users being edited
  const [editingUsers, setEditingUsers] = useState(new Map());
  const [savingUsers, setSavingUsers] = useState(new Set());

  // expanded parent users
  const [expandedUsers, setExpandedUsers] = useState(new Set());

  // Refs for inline editing inputs
  const passwordInputRefs = useRef({});

  const USER_STATUS_MAPPINGS = {
    'active': { badge_type: 'success', label: 'Active' },
    'inactive': { badge_type: 'danger', label: 'Inactive' },
    'pending': { badge_type: 'warning', label: 'Pending' },
  };

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

  const startEditing = (user, isSubAccount = false) => {
    const editData = {
      password: '',
      status: user.user_status || 'active',
      originalStatus: user.user_status || 'active',
      credits: user.num_part_credits || 20,
      originalCredits: user.num_part_credits || 20,
      isSubAccount: isSubAccount
    };
    setEditingUsers(prev => new Map(prev).set(user.user_id, editData));

    // Focus on password input after a brief delay
    setTimeout(() => {
      passwordInputRefs.current[user.user_id]?.focus();
    }, 50);
  };

  const cancelEditing = (userId) => {
    setEditingUsers(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  };

  const updateEditingData = (userId, field, value) => {
    setEditingUsers(prev => {
      const newMap = new Map(prev);
      const data = newMap.get(userId);
      if (data) {
        newMap.set(userId, { ...data, [field]: value });
      }
      return newMap;
    });
  };

  const saveUserChanges = async (userId) => {
    const editData = editingUsers.get(userId);
    if (!editData) return;

    try {
      const payload = {};
      if (editData.password.trim()) {
        payload.new_password = editData.password.trim();
      }
      if (editData.status !== editData.originalStatus) {
        payload.new_status = editData.status;
      }
      // Only allow credits updates for parent accounts, not sub-accounts
      if (showNumCredits && !editData.isSubAccount && editData.credits !== editData.originalCredits) {
        // Validate credits is a positive integer
        // If empty, use default value of 20
        const creditsValue = editData.credits === '' ? 20 : editData.credits;
        const creditsNum = parseInt(creditsValue, 10);
        if (isNaN(creditsNum) || creditsNum < 0) {
          setToastMessage('Credits must be a positive number.');
          setShowToast(true);
          return;
        }
        payload.new_num_part_credits = creditsNum;
      }

      if (Object.keys(payload).length === 0) {
        cancelEditing(userId);
        return;
      }

      setSavingUsers(prev => new Set(prev).add(userId));
      await apiService.updateUser(userId, payload);

      // Update both parent users and subAccounts
      setUsers(prevUsers => {
        return prevUsers.map(u => {
          if (u.user_id === userId) {
            return { 
              ...u, 
              ...(payload.new_status !== undefined ? { user_status: payload.new_status } : {}),
              ...(payload.new_num_part_credits !== undefined ? { num_part_credits: payload.new_num_part_credits } : {})
            };
          }
          if (u.subAccounts) {
            return {
              ...u,
              subAccounts: u.subAccounts.map(sub =>
                sub.user_id === userId
                  ? { 
                      ...sub, 
                      ...(payload.new_status !== undefined ? { user_status: payload.new_status } : {})
                    }
                  : sub
              )
            };
          }
          return u;
        });
      });

      setToastMessage('User updated successfully.');
      setShowToast(true);
      cancelEditing(userId);
    } catch (err) {
      console.error('Failed to update user:', err);
      setToastMessage('Failed to update user. Please try again.');
      setShowToast(true);
    } finally {
      setSavingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleUserCreated = (newUser) => {
    setUsers([newUser, ...users]);
  };

  useEffect(() => {
    fetchUsers();
  }, [parentUser]);

  // Define table columns
  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'created_at', label: 'Created' },
    { key: 'status', label: 'Status' },
    ...(showNumCredits ? [{ key: 'credits', label: 'Credits' }] : []),
    { key: 'password', label: 'Password' },
    { key: 'actions', label: 'Actions' }
  ];

  // Helper function to match filter
  const matchesFilter = (user) => {
    const normFilter = normalize(search);
    if (!normFilter) return true;

    if (filterField === 'all') {
      return normalize(user.username).includes(normFilter) || 
             normalize(user.user_status || 'active').includes(normFilter) ||
             normalize(new Date(user.created_at).toLocaleDateString()).includes(normFilter);
    } else if (filterField === 'username') {
      return normalize(user.username).includes(normFilter);
    } else if (filterField === 'status') {
      return normalize(user.user_status || 'active').includes(normFilter);
    } else if (filterField === 'created_at') {
      return normalize(new Date(user.created_at).toLocaleDateString()).includes(normFilter);
    }
    return true;
  };

  // Process and sort users
  const processedUsers = useMemo(() => {
    let result = [...users];

    // Apply filter
    result = result.filter(matchesFilter);

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'username') {
          valA = normalize(a.username);
          valB = normalize(b.username);
        } else if (sortConfig.key === 'created_at') {
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
        } else if (sortConfig.key === 'status') {
          valA = normalize(a.user_status || 'active');
          valB = normalize(b.user_status || 'active');
        } else {
          return 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, search, filterField, sortConfig]);

  const toggleExpand = (userId) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderTableRows = (usersToRender, level = 0, startingRowIndex = 0) => {
    const rows = [];
    let currentRowIndex = startingRowIndex;

    usersToRender.forEach(user => {
      const isEditing = editingUsers.has(user.user_id);
      const editData = editingUsers.get(user.user_id);
      const isSaving = savingUsers.has(user.user_id);
      const paddingLeft = `${level * 1.5}rem`;
      const isEvenRow = currentRowIndex % 2 === 0;
      const hasSubAccounts = user.subAccounts && user.subAccounts.length > 0;
      const isSubAccount = level > 0; // Sub-accounts are at level > 0

      rows.push(
        <tr 
          key={`user-${user.user_id}`}
          style={{
            backgroundColor: level === 0
              ? (isEvenRow ? '#f8f9fa' : '#ffffff')
              : (isEvenRow ? '#f5f5f5' : '#fafafa')
          }}
        >
          {/* Username Column */}
          <td
            className="ic-small"
            style={{
              paddingLeft: paddingLeft,
              borderRight: '1px solid #e9ecef',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {hasSubAccounts && (
                <button
                  onClick={() => toggleExpand(user.user_id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '2px',
                    marginRight: '8px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px'
                  }}
                  title={expandedUsers.has(user.user_id) ? 'Collapse sub-accounts' : 'Expand sub-accounts'}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FontAwesomeIcon
                    icon={expandedUsers.has(user.user_id) ? faChevronDown : faChevronRight}
                  />
                </button>
              )}
              {!hasSubAccounts && <div style={{ width: '28px' }} />}

              <FontAwesomeIcon icon={faUser} className="text-muted me-2" style={{ fontSize: '14px' }} />
              <span title={user.user_id} className="fw-bold">{user.user_friendly_name || user.username}</span>

              {hasSubAccounts && (
                <span style={{ color: '#666', fontSize: '0.85em', marginLeft: '0.5rem' }}>
                  ({user.subAccounts.length} sub-account{user.subAccounts.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </td>

          {/* Created Date Column */}
          <td
            className="ic-small"
            style={{
              borderRight: '1px solid #e9ecef',
              whiteSpace: 'nowrap'
            }}
          >
            {new Date(user.created_at).toLocaleDateString()}
          </td>

          {/* Status Column */}
          <td
            className="ic-small"
            style={{
              borderRight: '1px solid #e9ecef',
              whiteSpace: 'nowrap'
            }}
          >
            {isEditing ? (
              <Form.Select
                value={editData?.status || 'active'}
                onChange={(e) => updateEditingData(user.user_id, 'status', e.target.value)}
                disabled={isSaving}
                style={{
                  maxWidth: '150px',
                  fontSize: '12px'
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </Form.Select>
            ) : (
              <Badge bg={USER_STATUS_MAPPINGS[user.user_status]?.badge_type || 'secondary'}>
                {USER_STATUS_MAPPINGS[user.user_status]?.label || 'Inactive'}
              </Badge>
            )}
          </td>

          {/* Credits Column - only show if showNumCredits is true */}
          {showNumCredits && (
            <td
              className="ic-small"
              style={{
                borderRight: '1px solid #e9ecef',
                whiteSpace: 'nowrap'
              }}
            >
              {/* Only show credits for parent accounts, not sub-accounts */}
              {!isSubAccount ? (
                isEditing ? (
                  <Form.Control
                    type="text"
                    value={editData?.credits || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string or any digits
                      if (value === '' || /^\d*$/.test(value)) {
                        updateEditingData(user.user_id, 'credits', value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveUserChanges(user.user_id);
                      if (e.key === 'Escape') cancelEditing(user.user_id);
                    }}
                    disabled={isSaving}
                    placeholder="20"
                    style={{
                      maxWidth: '100px',
                      fontSize: '12px'
                    }}
                  />
                ) : (
                  <span>{user.num_part_credits || 20}</span>
                )
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
          )}
          {/* Password Column */}
          <td
            className="ic-small"
            style={{
              borderRight: '1px solid #e9ecef',
              whiteSpace: 'nowrap'
            }}
          >
            {isEditing ? (
              <Form.Control
                ref={(el) => { passwordInputRefs.current[user.user_id] = el; }}
                type="password"
                placeholder="New password"
                value={editData?.password || ''}
                onChange={(e) => updateEditingData(user.user_id, 'password', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveUserChanges(user.user_id);
                  if (e.key === 'Escape') cancelEditing(user.user_id);
                }}
                disabled={isSaving}
                style={{
                  maxWidth: '200px',
                  fontSize: '11px'
                }}
              />
            ) : (
              <span className="text-muted">••••••••</span>
            )}
          </td>

          {/* Actions Column */}
          <td className="ic-small" style={{ whiteSpace: 'nowrap' }}>
            {isEditing ? (
              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => saveUserChanges(user.user_id)}
                  disabled={isSaving}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  title="Save changes"
                >
                  {isSaving ? (
                    <Spinner as="span" animation="border" size="sm" />
                  ) : (
                    <FontAwesomeIcon icon={faCheck} />
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => cancelEditing(user.user_id)}
                  disabled={isSaving}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  title="Cancel"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </Button>
              </div>
            ) : (
              <Button
                variant="link"
                size="sm"
                onClick={() => startEditing(user, isSubAccount)}
                className="text-primary p-0"
                style={{ fontSize: '14px' }}
                title="Edit user"
              >
                <FontAwesomeIcon icon={faPencil} />
              </Button>
            )}
          </td>
        </tr>
      );
      currentRowIndex++;

      // Render subAccounts if expanded
      if (expandedUsers.has(user.user_id) && user.subAccounts) {
        const filteredSubAccounts = user.subAccounts.filter(matchesFilter);
        const subRows = renderTableRows(filteredSubAccounts, level + 1, currentRowIndex);
        rows.push(...subRows.rows);
        currentRowIndex = subRows.nextRowIndex;
      }
    });

    return { rows, nextRowIndex: currentRowIndex };
  };

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
              <Form.Select value={filterField} onChange={(e) => setFilterField(e.target.value)}>
                <option value="all">All Fields</option>
                <option value="username">Username</option>
                <option value="status">Status</option>
                <option value="created_at">Created Date</option>
              </Form.Select>
              <Form.Control
                type="text"
                placeholder="Filter users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <Button
              variant="primary"
              onClick={() => setShowCreateUserModal(true)}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              {parentUser ? 'Create New Sub Account' : 'Create New Account'}
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
              <p className="mt-3">Loading users...</p>
            </div>
          ) : processedUsers.length === 0 ? (
            <Card className="mb-2">
              <Card.Body className="text-center py-5">
                <FontAwesomeIcon
                  icon={faUser}
                  size="3x"
                  className="text-muted mb-3"
                />
                <h6 className="text-muted">No users found</h6>
              </Card.Body>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <Card.Body style={{ padding: 0 }}>
                <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                  <Table className="mb-0" style={{ minWidth: '900px' }} size="sm">
                    <thead
                      className="table-light"
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      <tr>
                        {columns.map((column, index) => (
                          <th
                            key={column.key}
                            onClick={() => column.key !== 'password' && column.key !== 'actions' && handleSort(column.key)}
                            style={{
                              fontWeight: '600',
                              borderRight: index < columns.length - 1 ? '1px solid #dee2e6' : 'none',
                              whiteSpace: 'nowrap',
                              fontSize: '14px',
                              textAlign: column.key === 'actions' ? 'center' : 'left',
                              verticalAlign: 'middle',
                              paddingTop: '8px',
                              paddingBottom: '8px',
                              cursor: column.key !== 'password' && column.key !== 'actions' ? 'pointer' : 'default',
                              userSelect: 'none'
                            }}
                          >
                            {column.label}
                            {column.key !== 'password' && column.key !== 'actions' && (
                              <FontAwesomeIcon
                                icon={
                                  sortConfig.key === column.key
                                    ? (sortConfig.direction === 'asc' ? faSortAsc : faSortDesc)
                                    : faSort
                                }
                                style={{ marginLeft: '5px', fontSize: '12px' }}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processedUsers.length > 0 ? (
                        renderTableRows(processedUsers).rows
                      ) : (
                        <tr>
                          <td colSpan={columns.length} className="text-center text-muted py-4">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Create User Modal */}
      <CreateUserModal
        show={showCreateUserModal}
        onHide={() => setShowCreateUserModal(false)}
        onUserCreated={handleUserCreated}
      />

      {/* Toast */}
      <ToastContainer className="p-3" position="top-end">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={4000}
          autohide
          bg={toastMessage?.includes('successfully') ? "success" : "danger"}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastMessage?.includes('successfully') ? 'Success' : 'Error'}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default Users;

