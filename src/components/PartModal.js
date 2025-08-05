import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Form, Spinner, Alert } from 'react-bootstrap';
import { apiService } from '../services/apiService';
import ReactImageMagnify from 'react-image-magnify';
import './PartModal.css';

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
                />
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

  // Simple state for image zoom
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Get primary image
  const getPrimaryImage = () => {
    console.log('Part data:', part);
    console.log('Part images:', part?.images);
    
    if (!part?.images || part.images.length === 0) {
      console.log('No images found for part');
      return null;
    }
    
    const primaryImage = part.images.find(img => img.isPrimary) || part.images[0];
    console.log('Primary image:', primaryImage);
    return primaryImage;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable dialogClassName="custom-modal-width">
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
            <Card className="mb-3">
              <Card.Body>
                {getPrimaryImage() ? (
                  <div>
                    <h6>Primary Image </h6>
                    <p className="text-muted small">Hover over the image to zoom in</p>
                    <div className="text-center position-relative">
                      <ReactImageMagnify
                        {...{
                          smallImage: {
                            alt: part?.partName || part?.name || 'Part Image',
                            width: 400,
                            height: 300,
                            src: getPrimaryImage().uri
                          },
                          largeImage: {
                            src: getPrimaryImage().uri,
                            width: 1200,
                            height: 1800
                          },
                          enlargedImageContainerDimensions: {
                            width: 400,
                            height: 300
                          },
                          enlargedImageContainerStyle: {
                            zIndex: 1500
                          },
                          shouldHideHintAfterFirstActivation: false
                        }}
                      />
                      {getPrimaryImage().isPrimary && (
                        <Badge bg="primary" className="part-image-badge">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-muted">
                      <p>No images available for this part</p>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Generated and Manual Content Side by Side */}
            {(part.generatedContent && Object.keys(part.generatedContent).length > 0) || part.manualContent || isEditing ? (
              <Row className="mb-3">
                {/* Generated Content - Left Column */}
                {part.generatedContent && Object.keys(part.generatedContent).length > 0 && (
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6>Generated Content</h6>
                          {!part.manualContent && !isEditing && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={startEditing}
                            >
                              Create Manual Content
                            </Button>
                          )}
                        </div>
                        {renderGeneratedContent(part.generatedContent)}
                      </Card.Body>
                    </Card>
                  </Col>
                )}

                {/* Manual Content - Right Column */}
                {(part.manualContent || isEditing) && (
                  <Col md={part.generatedContent && Object.keys(part.generatedContent).length > 0 ? 6 : 12}>
                    <Card className="h-100">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6>
                            {part.manualContent ? 'Manual Content' : 'Create Manual Content'}
                          </h6>
                          {!isEditing && part.manualContent && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={startEditing}
                            >
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
                                {part.manualContent ? 'Save' : 'Save Manual Content'}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={cancelEditing}
                                disabled={updateLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          renderManualContent(part.manualContent)
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>
            ) : null}
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
