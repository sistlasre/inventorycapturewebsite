import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';

const CreateBoxModal = ({ show, onHide, onBoxCreated, projectId, parentBoxId = null }) => {
  const [boxName, setBoxName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setBoxName('');
    setError('');
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!boxName.trim()) {
      setError('Location name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const boxData = {
        boxName: boxName.trim(),
        projectId: projectId,
        ...(parentBoxId && { parentBoxId: parentBoxId })
      };

      console.log('Creating location with data:', boxData);
      const response = await apiService.createBox(boxData);
      console.log('Location created:', response);
      debugger;

      // Transform the response to match the expected format
      const newBox = {
        boxId: response.data.boxId || response.data.box_id || response.data.id,
        boxName: response.data.boxName || response.data.box_name || boxName.trim(),
        projectId: response.data.projectId || response.data.project_id || projectId,
        parentBoxId: response.data.parentBoxId || response.data.parent_box_id || parentBoxId,
        dateCreated: response.data.date_created || response.data.dateCreated || response.data.created_at || new Date().toISOString(),
        dateUpdated: response.data.date_updated || response.data.dateUpdated || response.data.updated_at || new Date().toISOString(),
        partCount: 0,
        subBoxCount: 0
      };

      // Call the callback to add the box to the list
      onBoxCreated(newBox);
      
      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Failed to create box:', error);
      setError(error.response?.data?.message || 'Failed to create box. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = parentBoxId ? 'Create New Sub-location' : 'Create New Location';
  const inputLabel = parentBoxId ? 'Sub-location Name' : 'Location Name';
  const inputPlaceholder = parentBoxId ? 'Enter sub-location name' : 'Enter location name';
  const buttonText = parentBoxId ? 'Create Sub-location' : 'Create Location';

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          {modalTitle}
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
            <Form.Label>{inputLabel} *</Form.Label>
            <Form.Control
              type="text"
              placeholder={inputPlaceholder}
              value={boxName}
              onChange={(e) => setBoxName(e.target.value)}
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
            disabled={loading || !boxName.trim()}
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
                {buttonText}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateBoxModal;
