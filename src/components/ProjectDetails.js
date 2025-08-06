import React from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Button, Form, Toast, ToastContainer } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCogs, faBox, faCalendarAlt, faCubes, faPlus, faMapMarkerAlt, faEdit, faCheck, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import CreateBoxModal from './CreateBoxModal';
import ConfirmationModal from './ConfirmationModal';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [editingBox, setEditingBox] = React.useState(null);
  const [editingBoxName, setEditingBoxName] = React.useState('');
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [originalBoxName, setOriginalBoxName] = React.useState('');
  const [showCreateBoxModal, setShowCreateBoxModal] = React.useState(false);
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

  // Function to start editing a box name
  const startEditingBox = (box) => {
    setEditingBox(box.boxId);
    setEditingBoxName(box.boxName);
    setOriginalBoxName(box.boxName); // Store original name for reset on error
  };

  // Function to cancel editing
  const cancelEditingBox = () => {
    setEditingBox(null);
    setEditingBoxName('');
    setOriginalBoxName('');
  };

  // Function to save the updated box name
  const saveBoxName = async (boxId) => {
    if (!editingBoxName.trim()) {
      cancelEditingBox();
      return;
    }

    try {
      setUpdateLoading(true);
      
      // Call the API to update the box name
      await apiService.updateBox(boxId, {
        box_name: editingBoxName.trim(),
        project_id: projectId
      });

      // Update the local state with the new name
      setProject(prevProject => ({
        ...prevProject,
        boxes: prevProject.boxes.map(box => 
          box.boxId === boxId 
            ? { ...box, boxName: editingBoxName.trim() }
            : box
        )
      }));

      cancelEditingBox();
    } catch (error) {
      console.error('Failed to update box name:', error);
      
      // Reset the name back to original and show toast
      setEditingBoxName(originalBoxName);
      setToastMessage('Failed to update box name. Please try again.');
      setShowToast(true);
      
      // Cancel editing after a brief delay to show the reset
      setTimeout(() => {
        cancelEditingBox();
      }, 100);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Function to handle box creation
  const handleBoxCreated = (newBox) => {
    setProject(prevProject => ({
      ...prevProject,
      boxes: [newBox, ...(prevProject.boxes || [])],
      boxCount: (prevProject.boxCount || 0) + 1
    }));
  };

  // Function to handle project deletion
  const handleDeleteProject = () => {
    setShowDeleteModal(true);
  };

  // Function to confirm project deletion
  const confirmDeleteProject = async () => {
    if (!project) return;

    try {
      setDeleteLoading(true);
      await apiService.deleteProject(project.projectId);
      
      // Navigate back to dashboard on successful deletion
      navigate('/');
    } catch (error) {
      console.error('Failed to delete project:', error);
      setToastMessage(`Failed to delete project "${project.projectName}". Please try again.`);
      setShowToast(true);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  React.useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching project details for ID:', projectId);
        
        const response = await apiService.getProjectDetails(projectId);
        console.log('Project details response:', response);
        
        setProject(response.data);
      } catch (error) {
        console.error('Failed to fetch project details:', error);
        setError('Failed to load project details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading project details...</p>
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

  if (!project) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="text-center">
          Project not found.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="text-center flex-grow-1">{project.projectName}</h1>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleDeleteProject}
              title="Delete project"
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
              <h4>Project Details</h4>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>ID:</strong> {project.projectId}</p>
                  <p><strong>Status:</strong> {project.projectMetadata?.status || 'Active'}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Box Count:</strong> {project.boxCount || 0}</p>
                  <p><strong>Created:</strong> {formatDate(project.projectMetadata?.dateCreated)}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h4>Locations</h4>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateBoxModal(true)}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Location
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        {project.boxes && project.boxes.length > 0 ? (
          project.boxes.map((box) => (
            <Col md={6} lg={4} key={box.boxId} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Body className="d-flex flex-column">
                  {editingBox === box.boxId ? (
                    <div className="d-flex align-items-center mb-3">
                      <Form.Control
                        type="text"
                        value={editingBoxName}
                        onChange={(e) => setEditingBoxName(e.target.value)}
                        className="me-2"
                        size="sm"
                        disabled={updateLoading}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveBoxName(box.boxId);
                          } else if (e.key === 'Escape') {
                            cancelEditingBox();
                          }
                        }}
                        autoFocus
                      />
                      <div className="d-flex gap-1">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => saveBoxName(box.boxId)}
                          disabled={updateLoading || !editingBoxName.trim()}
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
                          onClick={cancelEditingBox}
                          disabled={updateLoading}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <Card.Title className="mb-0">{box.boxName}</Card.Title>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => startEditingBox(box)}
                        title="Edit box name"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                    </div>
                  )}
                  <div className="small text-muted mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      <span>Last updated: {formatDate(box.dateUpdated)}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faCubes} className="me-2" />
                      <Badge bg="secondary" className="me-2">{box.partCount || 0}</Badge>
                      <span>{box.partCount === 1 ? 'part' : 'parts'}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                      <Badge bg="secondary" className="me-2">{box.subBoxCount || 0}</Badge>
                      <span>{box.subBoxCount === 1 ? 'sub-location' : 'sub-locations'}</span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Link to={`/box/${box.boxId}`} className="btn btn-outline-primary btn-sm">
                      <FontAwesomeIcon icon={faBox} className="me-2" />
                      View Location
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <FontAwesomeIcon icon={faBox} size="3x" className="text-muted mb-3" />
                <h5 className="text-muted">No boxes found</h5>
                <p className="text-muted">Add your first box to get started!</p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateBoxModal(true)}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Add Location
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
      
      {/* Create Box Modal */}
      <CreateBoxModal
        show={showCreateBoxModal}
        onHide={() => setShowCreateBoxModal(false)}
        onBoxCreated={handleBoxCreated}
        projectId={projectId}
      />
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${project?.projectName}"? This action cannot be undone.`}
        confirmText="Delete Project"
        loading={deleteLoading}
      />
      
      {/* Toast for error notifications */}
      <ToastContainer className="p-3" position="top-end">
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)} 
          delay={4000} 
          autohide
          bg="danger"
        >
          <Toast.Header>
            <strong className="me-auto">Error</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default ProjectDetails;

