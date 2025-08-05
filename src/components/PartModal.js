import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Image, Badge, Form, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBarcode, faEdit, faCheck, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';

const PartModal = ({ show, onHide, part: initialPart }) => {
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for editing manual content
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [originalContent, setOriginalContent] = useState({});

  // Helper function to render generated content
  const renderGeneratedContent = (content) => {
    if (!content || Object.keys(content).length === 0) {
      return <p className="text-muted">No generated content available</p>;
    }

    return (
      <div className="row">
        {Object.entries(content).map(([key, value]) => (
          <div className="col-md-6 mb-2" key={key}>
            <strong>{key}:</strong> {
              Array.isArray(value) ? value.join(', ') : String(value)
            }
          </div>
        ))}
      </div>
    );
  };

  // Helper function to render manual content
  const renderManualContent = (content) => {
    if (!content) {
      return <p className="text-muted">No manual content available</p>;
    }

    if (typeof content === 'string') {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
    }

    if (typeof content === 'object') {
      return (
        <div className="row">
          {Object.entries(content).map(([key, value]) => (
            <div className="col-md-6 mb-2" key={key}>
              <strong>{key}:</strong> {
                Array.isArray(value) ? value.join(', ') : String(value)
              }
            </div>
          ))}
        </div>
      );
    }

    return <div>{String(content)}</div>;
  };

  // Functions for editing manual content
  const startEditing = () => {
    const isManualContentEmpty = !part.manualContent || 
      (typeof part.manualContent === 'object' && Object.keys(part.manualContent).length === 0) ||
      (typeof part.manualContent === 'string' && part.manualContent.trim() === '');
    
    const contentToEdit = isManualContentEmpty 
      ? { ...part.generatedContent } 
      : { ...part.manualContent };
    
    setOriginalContent({ ...contentToEdit });
    setEditingContent({ ...contentToEdit });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditingContent({ ...originalContent });
    setIsEditing(false);
  };

  const handleFieldChange = (key, value) => {
    setEditingContent(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addNewField = () => {
    const newKey = `new_field_${Date.now()}`;
    setEditingContent(prev => ({
      ...prev,
      [newKey]: ''
    }));
  };

  const removeField = (keyToRemove) => {
    setEditingContent(prev => {
      const newContent = { ...prev };
      delete newContent[keyToRemove];
      return newContent;
    });
  };

  const saveManualContent = async () => {
    setUpdateLoading(true);
    try {
      await apiService.updatePart(part.partId, {
        manualContent: editingContent,
        part_id: part.partId
      });
      setPart({ ...part, manualContent: editingContent });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update manual content:', error);
      setEditingContent({ ...originalContent });
    } finally {
      setUpdateLoading(false);
    }
  };

  // Render key-value editing form
  const renderEditingForm = () => {
    return (
      <div>
        {Object.entries(editingContent).map(([key, value]) => (
          <div key={key} className="mb-3">
            <div className="row">
              <div className="col-md-4">
                <Form.Control
                  type="text"
                  value={key}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    const newContent = { ...editingContent };
                    delete newContent[key];
                    newContent[newKey] = value;
                    setEditingContent(newContent);
                  }}
                  placeholder="Field name"
                />
              </div>
              <div className="col-md-7">
                <Form.Control
                  type="text"
                  value={Array.isArray(value) ? value.join(', ') : String(value)}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder="Field value"
                />
              </div>
              <div className="col-md-1">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeField(key)}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={addNewField}
          className="mb-3"
        >
          <FontAwesomeIcon icon={faPlus} className="me-1" />
          Add Field
        </Button>
      </div>
    );
  };

  // Fetch detailed part information when modal opens
  useEffect(() => {
    const fetchPartDetails = async () => {
      if (!initialPart || !show) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await apiService.getPartDetails(initialPart.partId);
        setPart(response.data);
      } catch (error) {
        console.error('Failed to fetch part details:', error);
        setError('Failed to load part details.');
        // Fallback to the initial part data
        setPart(initialPart);
      } finally {
        setLoading(false);
      }
    };

    fetchPartDetails();
  }, [initialPart, show]);

  // Get primary image
  const getPrimaryImage = () => {
    if (!part?.images || part.images.length === 0) return null;
    return part.images.find(img => img.isPrimary) || part.images[0];
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {part?.partName || part?.name || 'Part Details'}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading part details...</p>
          </div>
        )}

        {error && (
          <Alert variant="danger">{error}</Alert>
        )}

        {part && !loading && (
          <>
            {/* Primary Image */}
            {getPrimaryImage() && (
              <Card className="mb-3">
                <Card.Body>
                  <h6>Primary Image</h6>
                  <div className="text-center">
                    <Image 
                      src={getPrimaryImage().uri} 
                      alt={part.partName || part.name}
                      style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                      className="border rounded"
                    />
                    {getPrimaryImage().isPrimary && (
                      <Badge bg="primary" className="position-absolute top-0 start-0 m-2">
                        Primary
                      </Badge>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Generated Content */}
            {part.generatedContent && Object.keys(part.generatedContent).length > 0 && (
              <Card className="mb-3">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6>
                      <FontAwesomeIcon icon={faBarcode} className="me-2" />
                      Generated Content
                    </h6>
                    {!part.manualContent && !isEditing && (
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={startEditing}
                      >
                        <FontAwesomeIcon icon={faEdit} className="me-1" />
                        Create Manual Content
                      </Button>
                    )}
                  </div>
                  {renderGeneratedContent(part.generatedContent)}
                </Card.Body>
              </Card>
            )}

            {/* Manual Content */}
            {(part.manualContent || isEditing) && (
              <Card className="mb-3">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6>
                      <FontAwesomeIcon icon={faEdit} className="me-2" />
                      {part.manualContent ? 'Manual Content' : 'Create Manual Content'}
                    </h6>
                    {!isEditing && part.manualContent && (
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={startEditing}
                      >
                        <FontAwesomeIcon icon={faEdit} className="me-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <>
                      {renderEditingForm()}
                      <div className="mt-3">
                        <Button
                          variant="success"
                          size="sm"
                          className="me-2"
                          onClick={saveManualContent}
                          disabled={updateLoading}
                        >
                          {updateLoading ? (
                            <Spinner animation="border" size="sm" className="me-1" />
                          ) : (
                            <FontAwesomeIcon icon={faCheck} className="me-1" />
                          )}
                          {part.manualContent ? 'Save' : 'Save Manual Content'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={cancelEditing}
                          disabled={updateLoading}
                        >
                          <FontAwesomeIcon icon={faTimes} className="me-1" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    renderManualContent(part.manualContent)
                  )}
                </Card.Body>
              </Card>
            )}

            {/* No Manual Content Section */}
            {!part.manualContent && isEditing && (
              <Card className="mb-3 border-info">
                <Card.Body>
                  <h6 className="text-info">
                    <FontAwesomeIcon icon={faEdit} className="me-2" />
                    Create Manual Content
                  </h6>
                  {renderEditingForm()}
                  <div className="mt-3">
                    <Button
                      variant="success"
                      size="sm"
                      className="me-2"
                      onClick={saveManualContent}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <Spinner animation="border" size="sm" className="me-1" />
                      ) : (
                        <FontAwesomeIcon icon={faCheck} className="me-1" />
                      )}
                      Save Manual Content
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={updateLoading}
                    >
                      <FontAwesomeIcon icon={faTimes} className="me-1" />
                      Cancel
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button 
          variant="primary" 
          href={`/part/${part?.partId}`} 
          target="_blank"
          disabled={!part}
        >
          View Full Page
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PartModal;
