import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import ReactImageMagnify from 'react-image-magnify';
import './PartModal.css';

const PartModal = ({ show, onHide, part: initialPart, allParts = [], currentPartIndex = -1, onPartChange }) => {
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State for editing manual content
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [originalContent, setOriginalContent] = useState({});

  // Define the columns as specified
  const COLUMNS = [
    { key: 'mpn', label: 'MPN'},
    { key: 'secondarypartnumber', label: 'Secondary PN'},
    { key: 'quantity', label: 'QTY'},
    { key: 'manufacturer', label: 'MFR'},
    { key: 'datecode', label: 'Datecode'},
    { key: 'coo', label: 'COO'},
    { key: 'rohsstatus', label: 'RoHS'},
    { key: 'msl', label: 'MSL'},
    { key: 'serialorlotnumber', label: 'Serial/Lot Number'}
  ];

  // Helper function to render content grid
  const renderContentGrid = () => {
    const generatedContent = part.generatedContent || {};
    const manualContent = part.manualContent || {};

    return (
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th style={{width: '150px'}}>Field</th>
              <th style={{width: '200px'}}>Generated</th>
              <th style={{width: '200px'}}>Manual</th>
            </tr>
          </thead>
          <tbody>
            {COLUMNS.map(column => {
              const {key, label} = column;
              const generatedValue = Array.isArray(generatedContent[key]) 
                ? generatedContent[key].join(', ') 
                : String(generatedContent[key] || '');
              const manualValue = Array.isArray(manualContent[key]) 
                ? manualContent[key].join(', ') 
                : String(manualContent[key] || '');

              return (
                <tr key={key}>
                  <td><strong>{label}</strong></td>
                  <td className="text-muted">{generatedValue}</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editingContent[key] || ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        placeholder={generatedValue}
                      />
                    ) : (
                      <span>{manualValue || <span className="text-muted">—</span>}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
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


  const saveManualContent = async () => {
    setUpdateLoading(true);
    try {
      // Only send fields that differ from generated content
      const generatedContent = part.generatedContent || {};
      const changedFields = {};

      Object.keys(editingContent).forEach(key => {
        const editedValue = editingContent[key];
        const generatedValue = Array.isArray(generatedContent[key]) 
          ? generatedContent[key].join(', ') 
          : String(generatedContent[key] || '');
        const editedValueStr = String(editedValue || '');

        // Include field if it's different from generated content or if it's a new field
        if (editedValueStr !== generatedValue || !(key in generatedContent)) {
          changedFields[key] = editedValue;
        }
      });

      console.log('Sending only changed fields:', changedFields);

      await apiService.updatePart(part.partId, {
        manualContent: changedFields,
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


  // Reset image index when part changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [part?.partId]);

  // Image navigation functions
  const goToNextImage = () => {
    if (part?.images && part.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % part.images.length);
    }
  };

  const goToPreviousImage = () => {
    if (part?.images && part.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + part.images.length) % part.images.length);
    }
  };

  // Part navigation functions
  const goToNextPart = () => {
    if (allParts.length > 1 && currentPartIndex < allParts.length - 1 && onPartChange) {
      onPartChange(currentPartIndex + 1);
    }
  };

  const goToPreviousPart = () => {
    if (allParts.length > 1 && currentPartIndex > 0 && onPartChange) {
      onPartChange(currentPartIndex - 1);
    }
  };

  // Get current image
  const getCurrentImage = () => {
    if (!part?.images || part.images.length === 0) {
      return null;
    }
    return part.images[currentImageIndex] || part.images[0];
  };

  // Get image type badge variant and text
  const getImageTypeBadge = (image) => {
    if (!image) {
        return null;
    }

    let variant = 'secondary';
    let text = 'Unknown';

    if (image.type === 'primary') {
      variant = 'primary';
      text = 'Primary';
    } else if (image.type === 'supplemental') {
      variant = 'success';
      text = 'Supplemental';
    } else if (image.type === 'ipn') {
      variant = 'warning';
      text = 'IPN';
    } else if (image.imageType) {
      text = image.type.charAt(0).toUpperCase() + image.type.slice(1);
    }

    return { variant, text };
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable dialogClassName="custom-modal-width">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center justify-content-between w-100 me-4">
          <div className="d-flex align-items-center">
            {allParts.length > 1 && currentPartIndex > 0 && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={goToPreviousPart}
                className="me-2"
                title="Previous Part"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </Button>
            )}
            <span>{part?.partName || part?.name || 'Part Details'}</span>
            {allParts.length > 1 && currentPartIndex < allParts.length - 1 && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={goToNextPart}
                className="ms-2"
                title="Next Part"
              >
                <FontAwesomeIcon icon={faArrowRight} />
              </Button>
            )}
          </div>
          {allParts.length > 1 && (
            <small className="text-muted">
              Part {currentPartIndex + 1} of {allParts.length}
            </small>
          )}
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
          <Row>
            {/* Left Column - Images */}
            <Col md={5}>
              {/* Image Gallery */}
              <Card className="mb-3" style={{height: '100%'}}>
                <Card.Body>
                  {getCurrentImage() ? (
                    <div>
                      {/* Image Header with Navigation */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Images ({part.images.length})</h6>
                        {part.images.length > 1 && (
                          <div>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={goToPreviousImage}
                              className="me-1"
                            >
                              <FontAwesomeIcon icon={faChevronLeft} />
                            </Button>
                            <span className="small text-muted mx-2">
                              {currentImageIndex + 1} / {part.images.length}
                            </span>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={goToNextImage}
                            >
                              <FontAwesomeIcon icon={faChevronRight} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Image Display */}
                      <div className="text-center position-relative">
                        <ReactImageMagnify
                          {...{
                            smallImage: {
                              alt: part?.partName || part?.name || 'Part Image',
                              width: 300,
                              height: 225,
                              src: getCurrentImage().uri
                            },
                            largeImage: {
                              src: getCurrentImage().uri,
                              width: 900,
                              height: 1350
                            },
                            enlargedImageContainerDimensions: {
                              width: 300,
                              height: 225
                            },
                            enlargedImageContainerStyle: {
                              zIndex: 1500,
                              marginTop: "10px",
                              position: "absolute",
                              left: 0,
                              top: "100%"
                            },
                            shouldHideHintAfterFirstActivation: false,
                            enlargedImagePosition: "beside"
                          }}
                        />

                        {/* Image Type Badge */}
                        {(() => {
                          const badge = getImageTypeBadge(getCurrentImage());
                          return badge ? (
                            <Badge bg={badge.variant} className="part-image-badge">
                              {badge.text}
                            </Badge>
                          ) : null;
                        })()}
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
            </Col>

            {/* Right Column - Content Grid */}
            <Col md={7}>
              {((part.generatedContent && Object.keys(part.generatedContent).length > 0) || part.manualContent || isEditing) ? (
                <Card>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6>Part Information</h6>
                      <div>
                        {!isEditing && (
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={startEditing}
                            className="me-2"
                          >
                            {part.manualContent ? 'Edit Manual Content' : 'Create Manual Content'}
                          </Button>
                        )}
                        {isEditing && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2"
                              onClick={saveManualContent}
                              disabled={updateLoading}
                            >
                              {updateLoading ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={updateLoading}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {renderContentGrid()}
                  </Card.Body>
                </Card>
              ) : (
                <Card>
                  <Card.Body>
                    <div className="text-center py-4">
                      <p className="text-muted">No part information available</p>
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={startEditing}
                      >
                        Create Manual Content
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
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
