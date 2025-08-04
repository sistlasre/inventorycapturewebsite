import React from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Button, Image, Form, Toast, Collapse } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCogs, faImage, faCalendarAlt, faPlus, faBarcode, faIndustry, faHashtag, faMapMarkerAlt, faEdit, faCheck, faTimes, faChevronDown, faChevronUp, faFileText } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';

const PartDetails = () => {
  const { partId } = useParams();
  const [part, setPart] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  
  // State for editing manual content
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingContent, setEditingContent] = React.useState({});
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [originalContent, setOriginalContent] = React.useState({});
  
  // State for managing collapsed sections in image cards
  const [collapsedSections, setCollapsedSections] = React.useState({});

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

  // Helper function to check if two objects are deeply equal
  const deepEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  // Functions for editing manual content
  const startEditing = () => {
    // Check if manualContent is empty or doesn't exist
    const isManualContentEmpty = !part.manualContent || 
      (typeof part.manualContent === 'object' && Object.keys(part.manualContent).length === 0) ||
      (typeof part.manualContent === 'string' && part.manualContent.trim() === '');
    
    // Copy from generatedContent if manualContent is empty, otherwise use manualContent
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

  const handleKeyChange = (oldKey, newKey) => {
    setEditingContent(prev => {
      const newContent = { ...prev };
      const value = newContent[oldKey];
      delete newContent[oldKey];
      newContent[newKey] = value;
      return newContent;
    });
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
    // Check if content is different from generatedContent
    if (deepEqual(editingContent, part.generatedContent)) {
      setToastMessage('No changes detected - manual content is identical to generated content.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }

    setUpdateLoading(true);
    try {
      const response = await apiService.updatePart(partId, {
        manualContent: editingContent,
        part_id: partId
      });
      setPart({ ...part, manualContent: editingContent });
      setIsEditing(false);
      setToastMessage('Manual content saved successfully!');
    } catch (error) {
      console.error('Failed to update manual content:', error);
      setEditingContent({ ...originalContent });
      setToastMessage('Failed to save manual content. Please try again.');
    } finally {
      setUpdateLoading(false);
      setTimeout(() => setShowToast(false), 4000);
      setShowToast(true);
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

  // Toggle collapsed sections in image cards
  const toggleCollapse = (imageId, section) => {
    const key = `${imageId}-${section}`;
    setCollapsedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveManualContent();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  React.useEffect(() => {
    const fetchPartDetails = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching part details for ID:', partId);
        
        const response = await apiService.getPartDetails(partId);
        console.log('Part details response:', response);
        
        setPart(response.data);
        
        // Initialize collapsed sections to start collapsed (true means collapsed)
        if (response.data.images && response.data.images.length > 0) {
          const initialCollapsedState = {};
          response.data.images.forEach(image => {
            if (image.generatedContent && Object.keys(image.generatedContent).length > 0) {
              initialCollapsedState[`${image.id}-generated`] = true;
            }
            if (image.extractedText && image.extractedText.trim()) {
              initialCollapsedState[`${image.id}-extracted`] = true;
            }
          });
          setCollapsedSections(initialCollapsedState);
        }
      } catch (error) {
        console.error('Failed to fetch part details:', error);
        setError('Failed to load part details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (partId) {
      fetchPartDetails();
    }
  }, [partId]);

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading part details...</p>
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

  if (!part) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="text-center">
          Part not found.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">{part.name || 'Unnamed Part'}</h1>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <h4>Part Details</h4>
              <div className="row">
                <div className="col-md-4">
                  <p><strong>Part ID:</strong> {part.partId}</p>
                  <p>
                    <strong>Box ID:</strong>{' '}
                    <Link to={`/box/${part.boxId}`} className="text-decoration-none">
                      {part.boxId}
                    </Link>
                  </p>
                  <p><strong>Description:</strong> {part.description || 'No description'}</p>
                </div>
                <div className="col-md-4">
                  <p><strong>Created:</strong> {formatDate(part.dateCreated)}</p>
                  <p><strong>Updated:</strong> {formatDate(part.dateUpdated)}</p>
                  <p><strong>Image Count:</strong> {part.images?.length || 0}</p>
                </div>
                <div className="col-md-4">
                  {part.generatedContent?.Manufacturer && (
                    <p><strong>Manufacturer:</strong> {part.generatedContent.Manufacturer}</p>
                  )}
                  {part.generatedContent?.MPN && (
                    <p><strong>MPN:</strong> {part.generatedContent.MPN}</p>
                  )}
                  {part.generatedContent?.Quantity && (
                    <p><strong>Quantity:</strong> {part.generatedContent.Quantity}</p>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Content Sections - Side by Side or Stacked */}
      {(part.manualContent || (part.generatedContent && Object.keys(part.generatedContent).length > 0)) && (
        <Row className="mb-4">
          {/* Generated Content Section */}
          {part.generatedContent && Object.keys(part.generatedContent).length > 0 && (
            <Col md={part.manualContent ? 6 : 12}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4>
                      <FontAwesomeIcon icon={faBarcode} className="me-2" />
                      Generated Content
                    </h4>
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
            </Col>
          )}

          {/* Manual Content Section */}
          {(part.manualContent || isEditing) && (
            <Col md={part.generatedContent && Object.keys(part.generatedContent).length > 0 ? 6 : 12}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4>
                      <FontAwesomeIcon icon={faEdit} className="me-2" />
                      {part.manualContent ? 'Manual Content' : 'Create Manual Content'}
                    </h4>
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
            </Col>
          )}
        </Row>
      )}

      {/* Editing Manual Content Section (shown when creating from generated content) */}
      {!part.manualContent && isEditing && (
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm border-info">
              <Card.Body>
                <h4 className="text-info">
                  <FontAwesomeIcon icon={faEdit} className="me-2" />
                  Create Manual Content
                </h4>
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
          </Col>
        </Row>
      )}

      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h4>Images ({part.images?.length || 0})</h4>
            <Button variant="info" size="sm">
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Image
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        {part.images && part.images.length > 0 ? (
          part.images.map((image) => (
            <Col md={6} lg={4} key={image.id} className="mb-4">
              <Card className="shadow-sm h-100">
                <div className="position-relative">
                  <Image 
                    src={image.uri} 
                    alt={part.name} 
                    className="card-img-top" 
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                  {image.isPrimary && (
                    <Badge 
                      bg="primary" 
                      className="position-absolute top-0 start-0 m-2"
                    >
                      Primary
                    </Badge>
                  )}
                  <Badge 
                    bg={image.type === 'primary' ? 'success' : 'secondary'} 
                    className="position-absolute top-0 end-0 m-2"
                  >
                    {image.type}
                  </Badge>
                </div>
                <Card.Body>
                  <div className="small text-muted mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      <span>Captured: {formatDate(image.capturedAt)}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <FontAwesomeIcon icon={faImage} className="me-2" />
                      <span>ID: {image.id}</span>
                    </div>
                  </div>
                  
                  {/* Generated Content Section - Collapsible */}
                  {image.generatedContent && Object.keys(image.generatedContent).length > 0 && (
                    <div className="mt-3">
                      <div 
                        className="d-flex align-items-center justify-content-between" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleCollapse(image.id, 'generated')}
                      >
                        <h6 className="mb-0">
                          <FontAwesomeIcon icon={faBarcode} className="me-2" />
                          Generated Content
                        </h6>
                        <FontAwesomeIcon 
                          icon={collapsedSections[`${image.id}-generated`] ? faChevronDown : faChevronUp} 
                          className="text-muted"
                        />
                      </div>
                      <Collapse in={!collapsedSections[`${image.id}-generated`]}>
                        <div className="mt-2">
                          <div className="small">
                            {renderGeneratedContent(image.generatedContent)}
                          </div>
                        </div>
                      </Collapse>
                    </div>
                  )}

                  {/* Extracted Text Section - Collapsible */}
                  {image.extractedText && image.extractedText.trim() && (
                    <div className="mt-3">
                      <div 
                        className="d-flex align-items-center justify-content-between" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleCollapse(image.id, 'extracted')}
                      >
                        <h6 className="mb-0">
                          <FontAwesomeIcon icon={faFileText} className="me-2" />
                          Extracted Text
                        </h6>
                        <FontAwesomeIcon 
                          icon={collapsedSections[`${image.id}-extracted`] ? faChevronDown : faChevronUp} 
                          className="text-muted"
                        />
                      </div>
                      <Collapse in={!collapsedSections[`${image.id}-extracted`]}>
                        <div className="mt-2">
                          <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
                            {image.extractedText}
                          </div>
                        </div>
                      </Collapse>
                    </div>
                  )}

                  <div className="mt-3">
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      href={image.uri} 
                      target="_blank"
                      className="me-2"
                    >
                      <FontAwesomeIcon icon={faImage} className="me-1" />
                      View Full Size
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <Card className="text-center py-4">
              <Card.Body>
                <FontAwesomeIcon icon={faImage} size="2x" className="text-muted mb-3" />
                <h6 className="text-muted">No images found</h6>
                <p className="text-muted">Add images to document this part.</p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
      
      {/* Toast Notification */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1055 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={4000} autohide>
          <Toast.Header>
            <strong className="me-auto">Part Update</strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </div>
    </Container>
  );
};

export default PartDetails;

