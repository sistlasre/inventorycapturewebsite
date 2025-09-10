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
  Table,
  ProgressBar
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
  const [requestingUser, setRequestingUser] = useState(null);
  const [pricingPlans, setPricingPlans] = useState([]);
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

  // Requesting user editing state
  const [editingRequestingUser, setEditingRequestingUser] = useState(false);
  const [requestingUserEditData, setRequestingUserEditData] = useState({});
  const [savingRequestingUser, setSavingRequestingUser] = useState(false);

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
      setRequestingUser(response.data?.requesting_user || null);
      setPricingPlans(response.data?.pricing_plans || []);
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
      pricingPlan: user.pricing_plan || 'free',
      originalPricingPlan: user.pricing_plan || 'free',
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

    // Track credits for local update only
    let creditsForLocalUpdate = null;

    try {
      const payload = {};
      if (editData.password.trim()) {
        payload.new_password = editData.password.trim();
      }
      if (editData.status !== editData.originalStatus) {
        payload.new_status = editData.status;
      }
      // Check if pricing plan changed
      if (editData.pricingPlan !== editData.originalPricingPlan) {
        payload.new_pricing_plan = editData.pricingPlan;

        // If credits weren't manually changed, prepare to update local state only
        if (showNumCredits && !editData.isSubAccount && editData.credits === editData.originalCredits) {
          const newPlan = pricingPlans.find(p => p.pricingKey === editData.pricingPlan);
          if (newPlan && newPlan.numAvailableCredits) {
            creditsForLocalUpdate = newPlan.numAvailableCredits;
            // Don't send to backend - only update local state
          }
        }
      }

      // Only send manual credits updates to backend
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
              ...(payload.new_num_part_credits !== undefined ? { num_part_credits: payload.new_num_part_credits } : {}),
              ...(creditsForLocalUpdate !== null ? { num_part_credits: creditsForLocalUpdate } : {}),
              ...(payload.new_pricing_plan !== undefined ? { pricing_plan: payload.new_pricing_plan } : {})
            };
          }
          if (u.subAccounts) {
            return {
              ...u,
              subAccounts: u.subAccounts.map(sub =>
                sub.user_id === userId
                  ? { 
                      ...sub, 
                      ...(payload.new_status !== undefined ? { user_status: payload.new_status } : {}),
                      ...(payload.new_num_part_credits !== undefined ? { num_part_credits: payload.new_num_part_credits } : {}),
                      ...(creditsForLocalUpdate !== null ? { num_part_credits: creditsForLocalUpdate } : {}),
                      ...(payload.new_pricing_plan !== undefined ? { pricing_plan: payload.new_pricing_plan } : {})
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

  // Requesting user functions
  const startEditingRequestingUser = () => {
    setRequestingUserEditData({
      password: '',
      pricingPlan: requestingUser?.pricing_plan || 'free',
      originalPricingPlan: requestingUser?.pricing_plan || 'free'
    });
    setEditingRequestingUser(true);
  };

  const cancelEditingRequestingUser = () => {
    setEditingRequestingUser(false);
    setRequestingUserEditData({});
  };

  const saveRequestingUserChanges = async () => {
    // Track credits for local update only
    let creditsForLocalUpdate = null;

    try {
      const payload = {};
      if (requestingUserEditData.password?.trim()) {
        payload.new_password = requestingUserEditData.password.trim();
      }

      // Check if pricing plan changed
      if (requestingUserEditData.pricingPlan !== requestingUserEditData.originalPricingPlan) {
        payload.new_pricing_plan = requestingUserEditData.pricingPlan;

        // Prepare to update credits in local state based on new plan
        const newPlan = pricingPlans.find(p => p.pricingKey === requestingUserEditData.pricingPlan);
        if (newPlan && newPlan.numAvailableCredits) {
          creditsForLocalUpdate = newPlan.numAvailableCredits;
          // Don't send to backend - only update local state
        }
      }

      if (Object.keys(payload).length === 0) {
        cancelEditingRequestingUser();
        return;
      }

      setSavingRequestingUser(true);
      await apiService.updateUser(requestingUser.user_id, payload);

      // Update local state
      setRequestingUser(prev => ({
        ...prev,
        ...(payload.new_pricing_plan ? { pricing_plan: payload.new_pricing_plan } : {}),
        ...(creditsForLocalUpdate !== null ? { num_part_credits: creditsForLocalUpdate } : {})
      }));

      setToastMessage('Your account updated successfully.');
      setShowToast(true);
      cancelEditingRequestingUser();
    } catch (err) {
      console.error('Failed to update requesting user:', err);
      setToastMessage('Failed to update your account. Please try again.');
      setShowToast(true);
    } finally {
      setSavingRequestingUser(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [parentUser]);

  // Define table columns
  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'created_at', label: 'Created' },
    { key: 'status', label: 'Status' },
    ...(showNumCredits ? [
      { key: 'pricing_plan', label: 'Pricing Plan' },
      { key: 'credits_used', label: 'Credits Used' },
      { key: 'credits', label: 'Credits Available' }
    ] : []),
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
        } else if (sortConfig.key === 'pricing_plan') {
          valA = normalize(a.pricing_plan || 'free');
          valB = normalize(b.pricing_plan || 'free');
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

          {/* Pricing Plan Column - only show if showNumCredits is true */}
          {showNumCredits && (
            <td
              className="ic-small"
              style={{
                borderRight: '1px solid #e9ecef',
                whiteSpace: 'nowrap'
              }}
            >
              {isEditing ? (
                <Form.Select
                  value={editData?.pricingPlan || 'free'}
                  onChange={(e) => updateEditingData(user.user_id, 'pricingPlan', e.target.value)}
                  disabled={isSaving}
                  style={{
                    maxWidth: '150px',
                    fontSize: '12px'
                  }}
                >
                  {pricingPlans.map(plan => (
                    <option key={plan.pricingKey} value={plan.pricingKey}>
                      {plan.pricingLabel}
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <span>
                  {pricingPlans.find(p => p.pricingKey === (user.pricing_plan || 'free'))?.pricingLabel || 'Free'}
                </span>
              )}
            </td>
          )}

          {/* Credits Used Column - only show if showNumCredits is true */}
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
                <span>{user.num_credits_used || 0}</span>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
          )}

          {/* Credits Available Column - only show if showNumCredits is true */}
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
    <Container fluid className="py-3">
      {/* Requesting User Section */}
      {requestingUser && (
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm">
              <Card.Header>
                <h5 className="mb-0">Account Information</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Your Account Details
                  </h6>
                  {!editingRequestingUser ? (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={startEditingRequestingUser}
                    >
                      <FontAwesomeIcon icon={faPencil} className="me-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="d-flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={saveRequestingUserChanges}
                        disabled={savingRequestingUser}
                      >
                        {savingRequestingUser ? (
                          <Spinner as="span" animation="border" size="sm" />
                        ) : (
                          <><FontAwesomeIcon icon={faCheck} className="me-1" /> Save</>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={cancelEditingRequestingUser}
                        disabled={savingRequestingUser}
                      >
                        <FontAwesomeIcon icon={faTimes} className="me-1" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Username:</strong> <span className="ms-2">{requestingUser.username}</span>
                    </div>
                    <div className="mb-3">
                      <strong>Pricing Plan:</strong>
                      {editingRequestingUser ? (
                        <Form.Select
                          value={requestingUserEditData.pricingPlan}
                          onChange={(e) => setRequestingUserEditData(prev => ({...prev, pricingPlan: e.target.value}))}
                          disabled={savingRequestingUser}
                          className="ms-2 d-inline-block"
                          style={{ width: 'auto', maxWidth: '200px' }}
                        >
                          {pricingPlans.map(plan => (
                            <option key={plan.pricingKey} value={plan.pricingKey}>
                              {plan.pricingLabel}
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <span className="ms-2">
                          {pricingPlans.find(p => p.pricingKey === requestingUser.pricing_plan)?.pricingLabel || 'Free'}
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <strong>Password:</strong>
                      {editingRequestingUser ? (
                        <Form.Control
                          type="password"
                          placeholder="New password (leave blank to keep current)"
                          value={requestingUserEditData.password || ''}
                          onChange={(e) => setRequestingUserEditData(prev => ({...prev, password: e.target.value}))}
                          disabled={savingRequestingUser}
                          className="ms-2 d-inline-block"
                          style={{ width: 'auto', maxWidth: '300px' }}
                        />
                      ) : (
                        <span className="ms-2 text-muted">••••••••</span>
                      )}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Credits Usage:</strong>
                      <div className="mt-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-secondary">Used: {requestingUser.num_credits_used || 0}</span>
                          <span className="text-success">Available: {requestingUser.num_part_credits || 0}</span>
                        </div>
                        <ProgressBar style={{ height: '25px' }}>
                          <ProgressBar
                            variant="danger"
                            now={((requestingUser.num_credits_used || 0) / ((requestingUser.num_credits_used || 0) + (requestingUser.num_part_credits || 0))) * 100}
                            style={{ backgroundColor: '#dc3545' }}
                          />
                          <ProgressBar
                            variant="success"
                            now={((requestingUser.num_part_credits || 0) / ((requestingUser.num_credits_used || 0) + (requestingUser.num_part_credits || 0))) * 100}
                            style={{ backgroundColor: '#28a745' }}
                          />
                        </ProgressBar>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Managed Accounts Section */}
      <Row className="mb-3">
        <Col>
          <h4>Managed Accounts</h4>
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

