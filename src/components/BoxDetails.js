import React from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Button, Form, Toast, ToastContainer } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCogs, faBox, faCalendarAlt, faCubes, faPlus, faMapMarkerAlt, faImage, faEdit, faCheck, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import CreateBoxModal from './CreateBoxModal';
import ConfirmationModal from './ConfirmationModal';

const BoxDetails = () => {
  const { boxId } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [editingSubLocation, setEditingSubLocation] = React.useState(null);
  const [editingSubLocationName, setEditingSubLocationName] = React.useState('');
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [originalSubLocationName, setOriginalSubLocationName] = React.useState('');
  const [showCreateSubLocationModal, setShowCreateSubLocationModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never updated';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to start editing a sub-location name
  const startEditingSubLocation = (childBox) => {
    setEditingSubLocation(childBox.boxId);
    setEditingSubLocationName(childBox.boxName);
    setOriginalSubLocationName(childBox.boxName); // Store original name for reset on error
  };

  // Function to cancel editing
  const cancelEditingSubLocation = () => {
    setEditingSubLocation(null);
    setEditingSubLocationName('');
    setOriginalSubLocationName('');
  };

  // Function to save the updated sub-location name
  const saveSubLocationName = async (subLocationId) => {
    if (!editingSubLocationName.trim()) {
      cancelEditingSubLocation();
      return;
    }

    try {
      setUpdateLoading(true);
      
      // Call the API to update the sub-location (box) name
      // Sub-locations are boxes, so we use the same updateBox API
      await apiService.updateBox(subLocationId, {
        box_name: editingSubLocationName.trim(),
        project_id: box.projectId // Use the parent box's project ID
      });

      // Update the local state with the new name
      setBox(prevBox => ({
        ...prevBox,
        childBoxes: prevBox.childBoxes.map(childBox => 
          childBox.boxId === subLocationId 
            ? { ...childBox, boxName: editingSubLocationName.trim() }
            : childBox
        )
      }));

      cancelEditingSubLocation();
    } catch (error) {
      console.error('Failed to update sub-location name:', error);
      
      // Reset the name back to original and show toast
      setEditingSubLocationName(originalSubLocationName);
      setToastMessage('Failed to update sub-location name. Please try again.');
      setShowToast(true);
      
      // Cancel editing after a brief delay to show the reset
      setTimeout(() => {
        cancelEditingSubLocation();
      }, 100);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Function to handle sub-location creation
  const handleSubLocationCreated = (newSubLocation) => {
    setBox(prevBox => ({
      ...prevBox,
      childBoxes: [newSubLocation, ...(prevBox.childBoxes || [])],
      childBoxCount: (prevBox.childBoxCount || 0) + 1,
      subBoxCount: (prevBox.subBoxCount || 0) + 1
    }));
  };

  // Function to handle location deletion
  const handleDeleteLocation = () => {
    setShowDeleteModal(true);
  };

  // Function to confirm location deletion
  const confirmDeleteLocation = async () => {
    if (!box) return;

    try {
      setDeleteLoading(true);
      await apiService.deleteBox(box.boxId);
      
      // Navigate back to project details on successful deletion
      if (box.parentBoxId) {
          navigate(`/box/${box.parentBoxId}`);
      } else if (box.projectId) {
        navigate(`/project/${box.projectId}`);
      } else {
        // Fallback to dashboard if no project ID
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      setToastMessage(`Failed to delete location "${box.boxName}". Please try again.`);
      setShowToast(true);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  React.useEffect(() => {
    const fetchBoxDetails = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching box details for ID:', boxId);
        
        const response = await apiService.getBoxDetails(boxId);
        console.log('Box details response:', response);
        
        setBox(response.data);
      } catch (error) {
        console.error('Failed to fetch box details:', error);
        setError('Failed to load box details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (boxId) {
      fetchBoxDetails();
    }
  }, [boxId]);

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading box details...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!box) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="text-center">
          Box not found.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="text-center flex-grow-1">{box.boxName}</h1>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleDeleteLocation}
              title="Delete location"
            >
              <FontAwesomeIcon icon={faTrash} className="me-1" />
              Delete
            </Button>
          </div>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <h4>Box Details</h4>
              <div className="row">
                <div className="col-md-4">
                  <p>
                    <strong>Box ID:</strong>{' '}
                    <Link to={`/box/${box.boxId}`} className="text-decoration-none">
                      {box.boxId}
                    </Link>
                  </p>
                  <p>
                    <strong>Project ID:</strong>{' '}
                    <Link to={`/project/${box.projectId}`} className="text-decoration-none">
                      {box.projectId}
                    </Link>
                  </p>
                  {box.parentBoxId && (
                    <p>
                      <strong>Parent Box ID:</strong>{' '}
                      <Link to={`/box/${box.parentBoxId}`} className="text-decoration-none">
                        {box.parentBoxId}
                      </Link>
                    </p>
                  )}
                </div>
                <div className="col-md-4">
                  <p><strong>Created:</strong> {formatDate(box.dateCreated)}</p>
                  <p><strong>Updated:</strong> {formatDate(box.dateUpdated)}</p>
                </div>
                <div className="col-md-4">
                  <p><strong>Description:</strong> {box.description || 'No description'}</p>
                  <p><strong>Location:</strong> {box.location || 'No location specified'}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h4>Sub-locations ({box.childBoxCount || 0})</h4>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateSubLocationModal(true)}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Sub-location
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        {box.childBoxes && box.childBoxes.length > 0 ? (
          box.childBoxes.map((childBox) => (
            <Col md={6} lg={4} key={childBox.boxId} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Body className="d-flex flex-column">
                  {editingSubLocation === childBox.boxId ? (
                    <div className="d-flex align-items-center mb-3">
                      <Form.Control
                        type="text"
                        value={editingSubLocationName}
                        onChange={(e) => setEditingSubLocationName(e.target.value)}
                        className="me-2"
                        size="sm"
                        disabled={updateLoading}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveSubLocationName(childBox.boxId);
                          } else if (e.key === 'Escape') {
                            cancelEditingSubLocation();
                          }
                        }}
                        autoFocus
                      />
                      <div className="d-flex gap-1">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => saveSubLocationName(childBox.boxId)}
                          disabled={updateLoading || !editingSubLocationName.trim()}
                        >
                          {updateLoading ? (
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                            />
                          ) : (
                            <FontAwesomeIcon icon={faCheck} />
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={cancelEditingSubLocation}
                          disabled={updateLoading}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <Card.Title className="mb-0">{childBox.boxName}</Card.Title>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => startEditingSubLocation(childBox)}
                        title="Edit sub-location name"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                    </div>
                  )}
                  <div className="small text-muted mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      <span>Updated: {formatDate(childBox.dateUpdated)}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faCubes} className="me-2" />
                      <Badge bg="secondary" className="me-2">{childBox.partCount || 0}</Badge>
                      <span>{childBox.partCount === 1 ? 'part' : 'parts'}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                      <Badge bg="secondary" className="me-2">{childBox.subBoxCount || 0}</Badge>
                      <span>{childBox.subBoxCount === 1 ? 'sub-location' : 'sub-locations'}</span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Link to={`/box/${childBox.boxId}`} className="btn btn-outline-primary btn-sm">
                      <FontAwesomeIcon icon={faBox} className="me-2" />
                      View Sub-location
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <Card className="text-center py-4">
              <Card.Body>
                <FontAwesomeIcon icon={faMapMarkerAlt} size="2x" className="text-muted mb-3" />
                <h6 className="text-muted">No sub-locations found</h6>
                <p className="text-muted">Add sub-locations to organize this box further.</p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h4>Parts ({box.partCount || 0})</h4>
          </div>
        </Col>
      </Row>

      <Row>
        {box.parts && box.parts.length > 0 ? (
          box.parts.map((part) => (
            <Col md={6} lg={4} key={part.partId} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title className="mb-3">{part.partName}</Card.Title>
                  <div className="small text-muted mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      <span>Created: {formatDate(part.dateCreated)}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      <span>Updated: {formatDate(part.dateUpdated)}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faImage} className="me-2" />
                      <Badge bg="info" className="me-2">{part.imageCount || 0}</Badge>
                      <span>{part.imageCount === 1 ? 'image' : 'images'}</span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Link to={`/part/${part.partId}`} className="btn btn-outline-success btn-sm">
                      <FontAwesomeIcon icon={faCubes} className="me-2" />
                      View Part
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <Card className="text-center py-4">
              <Card.Body>
                <FontAwesomeIcon icon={faCubes} size="2x" className="text-muted mb-3" />
                <h6 className="text-muted">No parts found</h6>
                <p className="text-muted">Add parts to start organizing your inventory.</p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
      
      {/* Create Sub-location Modal */}
      <CreateBoxModal
        show={showCreateSubLocationModal}
        onHide={() => setShowCreateSubLocationModal(false)}
        onBoxCreated={handleSubLocationCreated}
        projectId={box?.projectId}
        parentBoxId={boxId}
      />
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteLocation}
        title="Delete Location"
        message={`Are you sure you want to delete location "${box?.boxName}"? This will also delete all its sub-locations and parts. This action cannot be undone.`}
        confirmText="Delete Location"
        loading={deleteLoading}
      />
      
      {/* Toast for error notifications */}
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
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default BoxDetails;
