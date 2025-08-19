import React, { useState, useRef } from 'react';
import { Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faTimes, faDownload, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'https://eadlroekyg.execute-api.us-east-1.amazonaws.com/dev';

const ProjectHeader = ({ 
  project, 
  projectId,
  leftButton = null, // { text, icon, onClick, title }
  showAddLocation = false,
  onAddLocation,
  onProjectUpdate,
  onDeleteProject,
  onShowToast
}) => {
  const { user } = useAuth();
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const projectNameInputRef = useRef(null);

  const startEditingProjectName = () => {
    setTempProjectName(project.projectName);
    setEditingProjectName(true);
    setTimeout(() => {
      projectNameInputRef.current?.focus();
      projectNameInputRef.current?.select();
    }, 0);
  };

  const cancelEditingProjectName = () => {
    setEditingProjectName(false);
    setTempProjectName('');
  };

  const saveProjectName = async () => {
    if (tempProjectName.trim() === '' || tempProjectName === project.projectName) {
      cancelEditingProjectName();
      return;
    }

    setSavingName(true);
    try {
      await apiService.updateProject(
        projectId,
        { project_name: tempProjectName, user_id: user.userId || user.user_id || user.id }
      );

      if (onProjectUpdate) {
        onProjectUpdate({ ...project, projectName: tempProjectName });
      }

      if (onShowToast) {
        onShowToast('Project name updated successfully.');
      }

      setEditingProjectName(false);
    } catch (error) {
      console.error('Failed to update project name:', error);
      if (onShowToast) {
        onShowToast('Failed to update project name. Please try again.');
      }
      setTempProjectName(project.projectName);
    } finally {
      setSavingName(false);
    }
  };

  const handleExportCSV = (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.location.href = `${API_BASE_URL}/project/${projectId}/export`;
  };

  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      {/* Left Button */}
      <div className="d-flex gap-2">
        {leftButton && (
          <Button
            variant="primary"
            size="sm"
            onClick={leftButton.onClick}
            title={leftButton.title || ''}
          >
            {leftButton.icon && (
              <FontAwesomeIcon icon={leftButton.icon} className="me-1" />
            )}
            {leftButton.text}
          </Button>
        )}
      </div>

      {/* Center - Editable Project Name */}
      <div className="text-center flex-grow-1">
        {editingProjectName ? (
          <div className="d-inline-flex align-items-center gap-2">
            <Form.Control
              ref={projectNameInputRef}
              type="text"
              value={tempProjectName}
              onChange={(e) => setTempProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveProjectName();
                if (e.key === 'Escape') cancelEditingProjectName();
              }}
              style={{ fontSize: '2rem', fontWeight: 'bold', width: 'auto', minWidth: '300px' }}
              disabled={savingName}
            />
            <Button
              variant="success"
              size="sm"
              onClick={saveProjectName}
              disabled={savingName}
              title="Save"
            >
              <FontAwesomeIcon icon={faCheck} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelEditingProjectName}
              disabled={savingName}
              title="Cancel"
            >
              <FontAwesomeIcon icon={faTimes} />
            </Button>
          </div>
        ) : (
          <h1 className="d-inline-flex align-items-center gap-2">
            {project?.projectName || 'Loading...'}
            <Button
              variant="link"
              size="sm"
              onClick={startEditingProjectName}
              className="text-secondary p-1"
              title="Edit project name"
              disabled={!project}
            >
              <FontAwesomeIcon icon={faPencil} />
            </Button>
          </h1>
        )}
      </div>

      {/* Right Buttons - Add Location, Export and Delete */}
      <div className="d-flex gap-2">
        {showAddLocation && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddLocation}
            title="Add new location"
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Add Location
          </Button>
        )}
        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleExportCSV}
          title="Download project as CSV"
        >
          <FontAwesomeIcon icon={faDownload} />
        </Button>
        <Button
          variant="outline-danger"
          size="sm"
          onClick={onDeleteProject}
          title="Delete project"
        >
          <FontAwesomeIcon icon={faTrash} className="me-1" />
          Delete
        </Button>
      </div>
    </div>
  );
};

export default ProjectHeader;
