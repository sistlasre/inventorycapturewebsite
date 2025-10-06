import React from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Form, Button, Toast, ToastContainer } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faPlus, faCog, faCalendarAlt, faMapMarkerAlt, faCubes, faEdit, faCheck, faTimes, faTrash, faDownload } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import CreateProjectModal from './CreateProjectModal';
import ConfirmationModal from './ConfirmationModal';

const API_BASE_URL = 'https://eadlroekyg.execute-api.us-east-1.amazonaws.com/dev';

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [editingProject, setEditingProject] = React.useState(null);
  const [editingName, setEditingName] = React.useState('');
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [originalName, setOriginalName] = React.useState('');
  const [showCreateProjectModal, setShowCreateProjectModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never updated';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to start editing a project name
  const startEditing = (project) => {
    setEditingProject(project.projectId);
    setEditingName(project.projectName);
    setOriginalName(project.projectName); // Store original name for reset on error
  };

  // Function to cancel editing
  const cancelEditing = () => {
    setEditingProject(null);
    setEditingName('');
    setOriginalName('');
  };

  // Function to save the updated project name
  const saveProjectName = async (projectId) => {
    if (!editingName.trim()) {
      cancelEditing();
      return;
    }

    try {
      setUpdateLoading(true);
      
      // Call the API to update the project name
      await apiService.updateProject(projectId, {
        project_name: editingName.trim(),
        user_id: user.userId || user.user_id || user.id
      });

      // Update the local state with the new name
      setProjects(projects.map(project => 
        project.projectId === projectId 
          ? { ...project, projectName: editingName.trim() }
          : project
      ));

      cancelEditing();
    } catch (error) {
      console.error('Failed to update project name:', error);
      
      // Reset the name back to original and show toast
      setEditingName(originalName);
      setToastMessage('Failed to update project name. Please try again.');
      setShowToast(true);
      
      // Cancel editing after a brief delay to show the reset
      setTimeout(() => {
        cancelEditing();
      }, 100);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Function to handle project creation
  const handleProjectCreated = (newProject) => {
    setProjects([newProject, ...projects]);
  };

  // Function to handle delete project
  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  // Function to confirm project deletion
  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      setDeleteLoading(true);
      await apiService.deleteProject(projectToDelete.projectId);
      
      // Remove the project from the local state
      setProjects(projects.filter(p => p.projectId !== projectToDelete.projectId));
      
      setToastMessage(`Project "${projectToDelete.projectName}" deleted successfully.`);
      setShowToast(true);
    } catch (error) {
      console.error('Failed to delete project:', error);
      setToastMessage(`Failed to delete project "${projectToDelete.projectName}". Please try again.`);
      setShowToast(true);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setProjectToDelete(null);
    }
  };

  React.useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError('');
        
        const response = await apiService.getUserProjects();
        // Handle different response formats
        const projectsData = response.data?.projects || response.data?.items || response.data || [];
        
        // Transform projects to ensure proper structure
        const transformedProjects = projectsData.map(project => ({
          ...project,
          projectId: project.projectId || project.project_id || project.id,
          projectName: project.projectName || project.project_name || project.name || 'Unnamed Project',
          dateUpdated: project.date_updated || project.dateUpdated || project.updated_at,
          dateCreated: project.created_at,
          boxCount: project.box_count || project.boxCount || project.extra_info?.boxCount || 0,
          partCount: project.part_count || 0
        }));
        
        setProjects(transformedProjects);
      } catch (error) {
        console.error('Failed to fetch user projects:', error);
        setError('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Dashboard</h1>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card className="mb-3 shadow-sm">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Projects</h5>
              <Button
                variant="primary"
                onClick={() => setShowCreateProjectModal(true)}
              >
                <FontAwesomeIcon icon={faPlus} className="me-2" /> Create Project
              </Button>
            </Card.Body>
          </Card>
          
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-3">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card className="mb-2">
              <Card.Body className="text-center py-5">
                <FontAwesomeIcon icon={faBox} size="3x" className="text-muted mb-3" />
                <h6 className="text-muted">No projects found</h6>
                <p className="text-muted">Create your first project to get started!</p>
              </Card.Body>
            </Card>
          ) : (
            projects.map((project) => (
              <Card key={project.projectId} className="mb-3 project-card">
                <Link 
                  to={`/project/${project.projectId}/edit`}
                  className="text-decoration-none"
                  onClick={(e) => {
                    // Prevent navigation if clicking on interactive elements
                    if (editingProject === project.projectId) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Card.Body className="project-card-clickable">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        {editingProject === project.projectId ? (
                          <div className="d-flex align-items-center mb-1">
                            <Form.Control
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="me-2"
                              size="sm"
                              disabled={updateLoading}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveProjectName(project.projectId);
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <div className="d-flex gap-1">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  saveProjectName(project.projectId);
                                }}
                                disabled={updateLoading || !editingName.trim()}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  cancelEditing();
                                }}
                                disabled={updateLoading}
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center mb-1">
                            <h5 className="mb-0 me-2">{project.projectName}</h5>
                            <div className="ms-auto d-flex gap-1">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  startEditing(project);
                                }}
                                title="Edit project name"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.location.href = `${API_BASE_URL}/project/${project.projectId}/export`;
                                }}
                                title="Download project as CSV"
                              >
                                <FontAwesomeIcon icon={faDownload} />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeleteProject(project);
                                }}
                                title="Delete project"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="d-flex flex-wrap gap-3 text-muted small">
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                            Created: {formatDate(project.dateCreated)}
                          </div>
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                            <Badge bg="secondary" className="me-1">{project.boxCount}</Badge>
                            {project.boxCount === 1 ? 'location' : 'locations'}
                          </div>
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon icon={faCubes} className="me-1" />
                            <Badge bg="secondary" className="me-1">{project.partCount}</Badge>
                            {project.partCount === 1 ? 'part' : 'parts'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Link>
              </Card>
            ))
          )}
        </Col>
      </Row>
      
      {/* Create Project Modal */}
      <CreateProjectModal
        show={showCreateProjectModal}
        onHide={() => setShowCreateProjectModal(false)}
        onProjectCreated={handleProjectCreated}
      />
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setProjectToDelete(null);
        }}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.projectName}"? This action cannot be undone.`}
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

export default Dashboard;

