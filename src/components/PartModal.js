import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
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

    // Combine all keys from both contents
    const allKeys = new Set([...Object.keys(generatedContent), ...Object.keys(manualContent)]);
    const keysToShow = COLUMNS.map(col => col.key).filter(key => allKeys.has(key));

    // Add any additional keys not in COLUMNS
    const additionalKeys = [...allKeys].filter(key => !COLUMNS.some(col => col.key === key));
    const finalKeys = [...keysToShow, ...additionalKeys];

    if (finalKeys.length === 0) {
      return <p className="text-muted">No content available</p>;
    }

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
            {finalKeys.map(key => {
              const label = COLUMNS.find(col => col.key === key)?.label || key;
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


  // Get primary image
  const getPrimaryImage = () => {
    if (!part?.images || part.images.length === 0) {
      console.log('No images found for part');
      return null;
    }

    const primaryImage = part.images.find(img => img.isPrimary) || part.images[0];
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
          <Row>
            {/* Left Column - Images */}
            <Col md={5}>
              {/* Primary Image */}
              <Card className="mb-3">
                <Card.Body>
                  {getPrimaryImage() ? (
                    <div>
                      <h6>Primary Image</h6>
                      <p className="text-muted small">Hover over the image to zoom in</p>
                      <div className="text-center position-relative">
                        <ReactImageMagnify
                          {...{
                            smallImage: {
                              alt: part?.partName || part?.name || 'Part Image',
                              width: 300,
                              height: 225,
                              src: getPrimaryImage().uri
                            },
                            largeImage: {
                              src: getPrimaryImage().uri,
                              width: 900,
                              height: 1350
                            },
                            enlargedImageContainerDimensions: {
                              width: 300,
                              height: 225
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
