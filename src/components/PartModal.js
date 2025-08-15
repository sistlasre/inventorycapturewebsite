import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faArrowLeft, faArrowRight, faThumbsUp, faRotateRight, faSave } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import ReactImageMagnify from 'react-image-magnify';
import './PartModal.css';
import { getHeaderForPart } from './sharedFunctions';

const PartModal = ({ show, onHide, part: initialPart, allParts = [], currentPartIndex = -1, onPartChange, projectData = null, currentLocation = null, onLocationChange }) => {
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State for editing manual content
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [originalContent, setOriginalContent] = useState({});
  const [focusFieldKey, setFocusFieldKey] = useState(null);
  const inputRefs = useRef({});

  // State for location navigation
  const [allLocations, setAllLocations] = useState([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(-1);

  const [frozenPos, setFrozenPos] = useState(null);
  const [freezeZoom, setFreezeZoom] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [savedImageRotations, setSavedImageRotations] = useState({}); // Track saved rotations per image
  const [savingRotation, setSavingRotation] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());

  // Update timestamp whenever the modal is shown
  useEffect(() => {
    if (show) {
      setCurrentTimestamp(Date.now());
    }
  }, [show]);

  const handleImageClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!freezeZoom) {
      setFrozenPos({ x, y });
      setFreezeZoom(true);
    } else {
      setFreezeZoom(false);
    }
  };

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
    { key: 'serialorlotnumber', label: 'Serial/Lot Number'},
    { key: 'notes', label: 'Notes'}
  ];

  // Helper function to render content grid
  const renderContentGrid = () => {
    const generatedContent = part.generatedContent || {};
    const manualContent = part.manualContent || {};

    return (
      <div className="table-responsive">
        <table className="table table-striped table-sm">
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
              let generatedValue = Array.isArray(generatedContent[key]) 
                ? generatedContent[key].join(', ') 
                : String(generatedContent[key] || '');
              generatedValue = key === 'notes' ? 'N/A' : generatedValue;
              const manualValue = Array.isArray(manualContent[key]) 
                ? manualContent[key].join(', ') 
                : String(manualContent[key] || '');

              return (
                <tr key={key}>
                  <td className="ic-small"><strong>{label}</strong></td>
                  <td className="text-muted ic-small">{generatedValue}</td>
                  <td className="ic-small">
                    {isEditing ? (
                      <input
                        ref={(el) => { inputRefs.current[key] = el; }}
                        type="text"
                        className="form-control form-control-sm ic-small"
                        value={editingContent[key] || ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                      />
                    ) : (
                      <span 
                        className="manual-content-field"
                        onClick={() => startEditing(key)}
                        style={{
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        title="Click to edit"
                      >
                        {manualValue || <span className="text-muted">—</span>}
                      </span>
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
  const startEditing = (fieldKey = null) => {
    const contentToEdit = part.manualContent;
    setOriginalContent({ ...contentToEdit });
    setEditingContent({ ...contentToEdit });
    setIsEditing(true);
    if (fieldKey) {
      setFocusFieldKey(fieldKey);
    }
  };

  // Auto-focus the input field when editing starts for a specific field
  useEffect(() => {
    if (isEditing && focusFieldKey && inputRefs.current[focusFieldKey]) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRefs.current[focusFieldKey]?.focus();
        setFocusFieldKey(null); // Reset focus field
      }, 0);
    }
  }, [isEditing, focusFieldKey]);

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
      const currentStatus = part.status || 'never_reviewed';
      if (Object.keys(editingContent).length || currentStatus != 'reviewed') {
        await apiService.updatePart(part.partId, {
            manualContent: editingContent,
            reviewStatus: 'reviewed',
            ...editingContent
        });
      } else {
        console.log("Manual content didn't change. No need to make a request to the backend");
      }

      // Create updated part object
      const updatedPart = { ...part, manualContent: editingContent, status: 'reviewed', reviewStatus: 'reviewed', ...editingContent};
      // Update local part state
      setPart(updatedPart);
      // Notify parent component of the status change with the updated part
      if (onPartChange) {
        onPartChange(null, updatedPart);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update manual content:', error);
      setEditingContent({ ...originalContent });
    } finally {
      setUpdateLoading(false);
    }
  };

  // Function to get status indicator for parts
  const getStatusIndicator = (part) => {
    const status = part?.status || 'never_reviewed';
    const color = status === 'reviewed' ? '#28a745' : '#6c757d'; // Green for reviewed, gray for never_reviewed
    const title = status === 'reviewed' ? 'Reviewed' : 'Not reviewed';

    return (
      <FontAwesomeIcon 
        icon={faThumbsUp} 
        style={{ 
          color: color, 
          fontSize: '48px'
        }}
      />
    );
  };

  // Fetch detailed part information when modal opens
  useEffect(() => {
    const fetchPartDetails = async () => {
      if (!initialPart || !show) return;

      // If we already have a part loaded with the same ID, don't refetch
      if (part && part.partId === initialPart.partId) {
        return;
      }

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


  // Reset image index and rotation when part changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setImageRotation(0);
    // Initialize saved rotations from part data
    if (part?.images) {
      const initialRotations = {};
      part.images.forEach((image) => {
        initialRotations[image.id] = image.rotation || 0;
      });
      setSavedImageRotations(initialRotations);
    }
  }, [part?.partId]);

  // Initialize location navigation when project data is available
  useEffect(() => {
    if (projectData && show) {
      const locations = getAllLocationsWithParts(projectData.boxes || []);
      setAllLocations(locations);

      // Find current location index
      if (currentLocation) {
        const locationIndex = locations.findIndex(loc => loc.boxId === currentLocation.boxId);
        setCurrentLocationIndex(locationIndex);
      }
    }
  }, [projectData, currentLocation, show]);

  // Helper function to recursively get all locations with parts
  const getAllLocationsWithParts = (boxes) => {
    let locations = [];

    const processBox = (box) => {
      // If this box has parts, add it to locations
      if (box.parts && box.parts.length > 0) {
        locations.push({
          boxId: box.boxId,
          boxName: box.boxName,
          parts: box.parts,
          partCount: box.parts.length
        });
      }

      // Recursively process child boxes
      if (box.childBoxes && box.childBoxes.length > 0) {
        box.childBoxes.forEach(childBox => {
          processBox(childBox);
        });
      }
    };

    boxes.forEach(box => {
      processBox(box);
    });

    return locations;
  };

  // Image navigation functions
  const goToNextImage = () => {
    if (part?.images && part.images.length > 1) {
      const newIndex = (currentImageIndex + 1) % part.images.length;
      setCurrentImageIndex(newIndex);
      // Load the saved rotation for the new image
      const newImage = part.images[newIndex];
      setImageRotation(savedImageRotations[newImage?.id] || 0);
    }
  };

  const goToPreviousImage = () => {
    if (part?.images && part.images.length > 1) {
      const newIndex = (currentImageIndex - 1 + part.images.length) % part.images.length;
      setCurrentImageIndex(newIndex);
      // Load the saved rotation for the new image
      const newImage = part.images[newIndex];
      setImageRotation(savedImageRotations[newImage?.id] || 0);
    }
  };

  // Image rotation function
  const rotateImage = () => {
    setImageRotation((prev) => (prev + 90) % 360);
  };

  // Save image rotation function
  const saveImageRotation = async () => {
    const currentImage = getCurrentImage();
    if (!currentImage) return;

    const currentSavedRotation = savedImageRotations[currentImage.id] || 0;

    // Only make API call if rotation has actually changed
    if (imageRotation === currentSavedRotation) {
      return;
    }

    setSavingRotation(true);
    try {
      await apiService.updateImage(currentImage.id, {
        partId: part.partId,
        rotation: imageRotation - currentSavedRotation
      });

      // Update local saved rotations state
      setSavedImageRotations(prev => ({
        ...prev,
        [currentImage.id]: imageRotation
      }));

      setCurrentTimestamp(Date.now());

    } catch (error) {
      console.error('Failed to save image rotation:', error);
      // Could show a toast/alert here
    } finally {
      setSavingRotation(false);
    }
  };

  // Check if current rotation is different from saved rotation
  const hasUnsavedRotation = () => {
    const currentImage = getCurrentImage();
    if (!currentImage) return false;
    const savedRotation = savedImageRotations[currentImage.id] || 0;
    return imageRotation !== savedRotation;
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

  // Location navigation functions
  const goToNextLocation = () => {
    if (allLocations.length > 1 && currentLocationIndex < allLocations.length - 1 && onLocationChange) {
      const nextLocation = allLocations[currentLocationIndex + 1];
      onLocationChange(nextLocation, 0); // Go to first part in next location
    }
  };

  const goToPreviousLocation = () => {
    if (allLocations.length > 1 && currentLocationIndex > 0 && onLocationChange) {
      const prevLocation = allLocations[currentLocationIndex - 1];
      onLocationChange(prevLocation, 0); // Go to first part in previous location
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
    } else if (image.type === 'ipn_label') {
      variant = 'warning';
      text = 'IPN';
    } else if (image.imageType) {
      text = image.type.charAt(0).toUpperCase() + image.type.slice(1);
    }

    return { variant, text };
  };

  const getImageDimension = (dimension) => {
    if (window) {
        return Math.floor(dimension == 'height' ? 0.33 * window.innerHeight : 0.5 * window.innerWidth);
    }
    return dimension == 'height'? 225 : 300;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable dialogClassName="custom-modal-width">
      <Modal.Header closeButton>
        <div className="position-absolute" style={{ left: '16px', top: '16px', zIndex: 1060 }}>
          {part && getStatusIndicator(part)}
        </div>
        <Modal.Title className="d-flex align-items-center justify-content-center w-100 me-4">
          <div className="d-flex align-items-center flex-column">
            {/* Part Navigation */}
            <div className="d-flex align-items-center">
              <span className="fw-bold">{getHeaderForPart(part)}</span>
            </div>

            {/* Navigation Info */}
            <div className="d-flex align-items-center gap-3 mt-1">
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
              {allParts.length > 1 && (
                <small className="text-muted">
                  Part {currentPartIndex + 1} of {allParts.length}
                </small>
              )}
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
          </div>
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
          <Row style={{height: '100%'}}>
            {/* Left Column - Images */}
            <Col md={8}>
              {/* Image Gallery */}
              <Card className="mb-3" style={{height: '100%'}}>
                <Card.Body>
                  {getCurrentImage() ? (
                    <div>
                      {/* Image Header with Navigation */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Images ({part.images.length})</h6>
                        <div className="d-flex align-items-center gap-2">
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
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={rotateImage}
                            className="me-2"
                            title="Rotate Image 90° Clockwise"
                          >
                            <FontAwesomeIcon icon={faRotateRight} />
                          </Button>
                          <Button
                            variant={hasUnsavedRotation() ? "outline-warning" : "outline-secondary"}
                            size="sm"
                            onClick={saveImageRotation}
                            className="me-2"
                            disabled={savingRotation || !hasUnsavedRotation()}
                            title={hasUnsavedRotation() ? "Save Image Rotation" : "No rotation changes to save"}
                          >
                            {savingRotation ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FontAwesomeIcon icon={faSave} />
                            )}
                          </Button>
                          <a 
                            href={getCurrentImage().uri + `?v=${currentTimestamp}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-outline-primary btn-sm"
                            title="View Full Image"
                          >
                            View Full Image
                          </a>
                        </div>
                      </div>

                      {/* Image Display */}
                      <div className='text-center position-relative' onClick={handleImageClick}>
                        {!freezeZoom && (
                        <div style={{
                          '--magnify-rotation': `${imageRotation}deg`
                        }} className={`magnify-container rotation-${imageRotation}`}>
                          <ReactImageMagnify
                            {...{
                              smallImage: {
                                alt: part?.partName || part?.name || 'Part Image',
                                width: getImageDimension('width'),
                                height: getImageDimension('height'),
                                src: getCurrentImage().uri + `?v=${currentTimestamp}`
                              },
                              largeImage: {
                                src: getCurrentImage().uri + `?v=${currentTimestamp}`,
                                width: getImageDimension('width') * 3,
                                height: getImageDimension('height') * 3
                              },
                              enlargedImagePosition: "over",
                              hoverDelayInMs: 0,
                              imageStyle: {
                                  objectFit: 'contain',
                                  transform: `rotate(${imageRotation}deg)`
                              }
                            }}
                          />
                        </div>
                        )}
                        {freezeZoom && (
                            <>
                                <img
                                    src={getCurrentImage().uri + `?v=${currentTimestamp}`}
                                    alt={part.name}
                                    style={{
                                        height: getImageDimension('height'), 
                                        width: getImageDimension('width'), 
                                        display: "block", 
                                        objectFit: 'contain',
                                        transform: `rotate(${imageRotation}deg)`
                                    }}
                                />
                                {/* Frozen magnified view */}
                                <div
                                    style={{
                                        width: getImageDimension('width'),
                                        height: getImageDimension('height'),
                                        marginTop: "10px",
                                        overflow: "hidden",
                                        border: "1px solid #ccc",
                                    }}
                                >
                                    <img
                                        src={getCurrentImage().uri + `?v=${currentTimestamp}`}
                                        style={{
                                            width: `${getImageDimension('width') * 3}px`,
                                            height: `${getImageDimension('height') * 3}px`,
                                            transform: `translate(-${frozenPos?.x * 2 || 0}px, -${frozenPos?.y * 2 || 0}px) rotate(${imageRotation}deg)`,
                                        }}
                                        alt="Frozen zoom"
                                    />
                                </div>
                            </>
                        )}

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
            <Col md={4}>
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
    </Modal>
  );
};

export default PartModal;
