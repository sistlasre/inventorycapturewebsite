import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

const CreateProjectModal = ({ show, onHide, onProjectCreated }) => {
  const { user } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setProjectName('');
    setError('');
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const projectData = {
        project_name: projectName.trim(),
        user_id: user.userId || user.user_id || user.id
      };

      console.log('Creating project with data:', projectData);
      const response = await apiService.createProject(projectData);
      console.log('Project created:', response);

      const createdProject = response.data?.project;

      // Transform the response to match the expected format
      const newProject = {
        projectId: createdProject?.projectId || createdProject?.project_id || createdProject?.id,
        projectName: createdProject?.projectName || createdProject?.project_name || projectName.trim(),
        dateUpdated: createdProject?.date_updated || createdProject?.dateUpdated || createdProject?.created_at || new Date().toISOString(),
        boxCount: 0
      };

      // Call the callback to add the project to the list
      onProjectCreated(newProject);
      
      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      setError(error.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Create New Project
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
            <Form.Label>Project Name *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
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
            disabled={loading || !projectName.trim()}
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
                Create Project
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
