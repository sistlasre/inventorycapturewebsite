import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Toast, ToastContainer } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import PartModal from './PartModal';
import ConfirmationModal from './ConfirmationModal';
import CreateBoxModal from './CreateBoxModal';
import { getHeaderForPart } from './sharedFunctions';

const ProjectVerboseView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [loadingBoxes, setLoadingBoxes] = useState(new Set());
  const [fetchedBoxes, setFetchedBoxes] = useState(new Set());
  const [selectedPart, setSelectedPart] = useState(null);
  const [showPartModal, setShowPartModal] = useState(false);
  const [currentBoxParts, setCurrentBoxParts] = useState([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(-1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'project', 'box', or 'part'
  const [showCreateBoxModal, setShowCreateBoxModal] = useState(false);

  // Define the columns as specified
  const columns = [
    { key: 'name', label: 'Name'},
    { key: 'mpn', label: 'MPN'},
    { key: 'secondarypartnumber', label: 'Secondary PN'},
    { key: 'quantity', label: 'QTY'},
    { key: 'manufacturer', label: 'MFR'},
    { key: 'datecode', label: 'Datecode'},
    { key: 'coo', label: 'COO'},
    { key: 'rohsstatus', label: 'RoHS'},
    { key: 'msl', label: 'MSL' },
    { key: 'notes', label: 'Notes'}
  ];

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await apiService.getProjectDetails(projectId);
        setProject(response.data);
      } catch (error) {
        console.error('Failed to fetch project details:', error);
        setError('Failed to load project details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

const fetchBoxDetails = async (boxId) => {
    // Don't fetch if already fetched or currently loading
    if (fetchedBoxes.has(boxId) || loadingBoxes.has(boxId)) {
      return;
    }

    try {
      setLoadingBoxes(prev => new Set(prev).add(boxId));

      const response = await apiService.getBoxDetails(boxId, true); // Use verbose endpoint

      // Update the project state with box details
      setProject(prevProject => {
        const updateBoxInTree = (boxes) => {
          return boxes.map(box => {
            if (box.boxId === boxId) {
              return { ...box, ...response.data };
            }
            if (box.childBoxes && box.childBoxes.length > 0) {
              return {
                ...box,
                childBoxes: updateBoxInTree(box.childBoxes)
              };
            }
            return box;
          });
        };

        return {
          ...prevProject,
          boxes: updateBoxInTree(prevProject.boxes)
        };
      });

      // Mark as fetched
      setFetchedBoxes(prev => new Set(prev).add(boxId));
    } catch (error) {
      console.error('Failed to fetch location details:', error);
    } finally {
      setLoadingBoxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(boxId);
        return newSet;
      });
    }
  };

const handleBoxClick = (boxId, event) => {
    event.preventDefault();

    // Check if we're in the ProjectVerboseView context
    const currentPath = window.location.pathname;
    if (currentPath.includes('/verbose')) {
      // We're in the verbose view, toggle expansion
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(boxId)) {
        newExpanded.delete(boxId);
      } else {
        newExpanded.add(boxId);
        // Fetch box details when expanding
        fetchBoxDetails(boxId);
      }
      setExpandedItems(newExpanded);
    } else {
      // Navigate to the box detail page
      navigate(`/box/${boxId}`);
    }
  };

  const getFieldValue = (item, field) => {
    // For parts, try to get values from generated or manual content
    return item[field] || item.manualContent?.[field] || item.generatedContent?.[field] || '';
  };

  // Function to get all parts from a specific box (including child boxes)
  const getAllPartsFromBox = (box) => {
    let allParts = [...(box.parts || [])];

    // Recursively get parts from child boxes
    if (box.childBoxes && box.childBoxes.length > 0) {
      box.childBoxes.forEach(childBox => {
        allParts = [...allParts, ...getAllPartsFromBox(childBox)];
      });
    }

    return allParts;
  };

  // Function to find the box that contains a specific part
  const findBoxContainingPart = (boxes, partId) => {
    for (const box of boxes) {
      // Check if the part is directly in this box
      if (box.parts && box.parts.some(part => part.partId === partId)) {
        return box;
      }
      // Recursively check child boxes
      if (box.childBoxes && box.childBoxes.length > 0) {
        const foundBox = findBoxContainingPart(box.childBoxes, partId);
        if (foundBox) return foundBox;
      }
    }
    return null;
  };

  // Function to handle part modal opening with navigation context
  const handlePartClick = (part, e) => {
    e.preventDefault();

    // Find the box that contains this part
    const containingBox = findBoxContainingPart(project.boxes, part.partId);

    if (containingBox) {
      // Get all parts from this box (including child boxes)
      const boxParts = getAllPartsFromBox(containingBox);
      const partIndex = boxParts.findIndex(p => p.partId === part.partId);

      setCurrentBoxParts(boxParts);
      setCurrentPartIndex(partIndex);
    } else {
      // Fallback: just show the single part
      setCurrentBoxParts([part]);
      setCurrentPartIndex(0);
    }

    setSelectedPart(part);
    setShowPartModal(true);
  };

  // Function to handle part navigation within the modal
  const handlePartChange = (newIndex) => {
    if (newIndex >= 0 && newIndex < currentBoxParts.length) {
      const newPart = currentBoxParts[newIndex];
      setSelectedPart(newPart);
      setCurrentPartIndex(newIndex);
    }
  };

  // Function to handle location change from the modal
  const handleLocationChange = (newLocation, partIndex = 0) => {
    // Find the actual box object containing this location
    const findBox = (boxes, boxId) => {
      for (const box of boxes) {
        if (box.boxId === boxId) {
          return box;
        }
        if (box.childBoxes && box.childBoxes.length > 0) {
          const found = findBox(box.childBoxes, boxId);
          if (found) return found;
        }
      }
      return null;
    };

    const newBox = findBox(project.boxes, newLocation.boxId);
    if (newBox && newBox.parts && newBox.parts.length > partIndex) {
      // Get all parts from this new location
      const newBoxParts = getAllPartsFromBox(newBox);
      const newPart = newBoxParts[partIndex];

      setCurrentBoxParts(newBoxParts);
      setCurrentPartIndex(partIndex);
      setSelectedPart(newPart);
    }
  };

  const renderTableRows = (boxes, level = 0, startingRowIndex = 0) => {
    const rows = [];
    let currentRowIndex = startingRowIndex;

    boxes.forEach(box => {
      // Box row
      const paddingLeft = `${level * 1.5 + 1}rem`;
      const subBoxCount = (box.childBoxes || []).length;
      const partCount = (box.parts || []).length;
      const isEvenRow = currentRowIndex % 2 === 0;

      rows.push(
        <tr 
          key={`box-${box.boxId}`} 
          style={{ 
            backgroundColor: level === 0 
              ? (isEvenRow ? '#f8f9fa' : '#ffffff') 
              : (isEvenRow ? '#f5f5f5' : '#fafafa')
          }}
        >
            <td 
              key='name'
              colSpan='100'
              style={{ 
                paddingLeft: paddingLeft,
                borderRight: '1px solid #e9ecef',
                whiteSpace: 'nowrap'
              }}
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={(e) => handleBoxClick(box.boxId, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '2px',
                        marginRight: '8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px'
                      }}
                      title={expandedItems.has(box.boxId) ? 'Collapse location' : 'Expand location'}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <FontAwesomeIcon 
                        icon={expandedItems.has(box.boxId) ? faChevronDown : faChevronRight} 
                      />
                    </button>
                    <Link 
                      to={`/box/${box.boxId}`}
                      onClick={(e) => handleBoxClick(box.boxId, e)}
                      style={{ textDecoration: 'none', color: '#0066cc', fontWeight: 'bold' }}
                    >
                      {box.boxName}
                    </Link>
                    <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '0.5rem' }}>
                      ({box.subBoxCount} sub-locations, {box.partCount} parts)
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteBox(box);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      padding: '4px',
                      marginLeft: '8px',
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}
                    title={`Delete location "${box.boxName}"`}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
            </td>
        </tr>
      );
      currentRowIndex++;

      // If expanded, show parts and sub-boxes
      if (expandedItems.has(box.boxId)) {
        // First render sub-boxes recursively
        if (box.childBoxes && box.childBoxes.length > 0) {
          const subBoxRows = renderTableRows(box.childBoxes, level + 1, currentRowIndex);
          rows.push(...subBoxRows.rows);
          currentRowIndex = subBoxRows.nextRowIndex;
        }
        // Then render parts
        if (box.parts && box.parts.length > 0) {
          box.parts.forEach(part => {
            const isEvenPartRow = currentRowIndex % 2 === 0;
            rows.push(
              <tr 
                key={`part-${part.partId}`}
                style={{ 
                  backgroundColor: isEvenPartRow ? '#f9f9f9' : '#ffffff'
                }}
              >
                {columns.map(column => (
                  <td 
                    key={column.key} 
                    style={{ 
                      paddingLeft: column.key === 'name' ? `${(level + 1) * 1.5}rem` : '0.75rem',
                      borderRight: '1px solid #e9ecef',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {column.key === 'name' && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Link 
                          to={`/part/${part.partId}`}
                          onClick={(e) => handlePartClick(part, e)}
                          style={{ textDecoration: 'none', color: '#333', cursor: 'pointer' }}
                        >
                          🔧 {getHeaderForPart(part)}
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeletePart(part);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc3545',
                            cursor: 'pointer',
                            padding: '4px',
                            marginLeft: '8px',
                            borderRadius: '3px',
                            fontSize: '12px'
                          }}
                          title={`Delete part "${part.partName || part.name}"`}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )}
                    {column.key !== 'name' && getFieldValue(part, column.key)}
                  </td>
                ))}
              </tr>
            );
            currentRowIndex++;
          });
        }

      }
    });

    return { rows, nextRowIndex: currentRowIndex };
  };

  // Function to handle project deletion
  const handleDeleteProject = () => {
    setItemToDelete(project);
    setDeleteType('project');
    setShowDeleteModal(true);
  };

  // Function to handle box deletion
  const handleDeleteBox = (box) => {
    setItemToDelete(box);
    setDeleteType('box');
    setShowDeleteModal(true);
  };

  // Function to handle part deletion  
  const handleDeletePart = (part) => {
    setItemToDelete(part);
    setDeleteType('part');
    setShowDeleteModal(true);
  };

  // Function to confirm deletion based on type
  const confirmDelete = async () => {
    if (!itemToDelete || !deleteType) return;

    try {
      setDeleteLoading(true);

      if (deleteType === 'project') {
        await apiService.deleteProject(itemToDelete.projectId);
        // Navigate back to dashboard on successful deletion
        navigate('/');

      } else if (deleteType === 'box') {
        await apiService.deleteBox(itemToDelete.boxId);

        // Remove the box and its children from the project state
        setProject(prevProject => {
          const removeBoxFromTree = (boxes) => {
            return boxes.filter(box => {
              if (box.boxId === itemToDelete.boxId) {
                return false; // Remove this box
              }
              // Recursively remove from child boxes
              if (box.childBoxes && box.childBoxes.length > 0) {
                box.childBoxes = removeBoxFromTree(box.childBoxes);
              }
              return true;
            });
          };

          return {
            ...prevProject,
            boxes: removeBoxFromTree(prevProject.boxes)
          };
        });

        setToastMessage(`Location "${itemToDelete.boxName}" deleted successfully.`);
        setShowToast(true);

      } else if (deleteType === 'part') {
        await apiService.deletePart(itemToDelete.partId);

        // Remove the part from the project state
        setProject(prevProject => {
          const removePartFromBoxes = (boxes) => {
            return boxes.map(box => {
              if (box.parts && box.parts.length > 0) {
                box.parts = box.parts.filter(part => part.partId !== itemToDelete.partId);
              }
              // Recursively check child boxes
              if (box.childBoxes && box.childBoxes.length > 0) {
                box.childBoxes = removePartFromBoxes(box.childBoxes);
              }
              return box;
            });
          };

          return {
            ...prevProject,
            boxes: removePartFromBoxes(prevProject.boxes)
          };
        });

        setToastMessage(`Part "${itemToDelete.partName || itemToDelete.name}" deleted successfully.`);
        setShowToast(true);
      }

    } catch (error) {
      console.error(`Failed to delete ${deleteType}:`, error);
      if (deleteType === 'project') {
        setError(`Failed to delete project "${itemToDelete.projectName}". Please try again.`);
      } else {
        setToastMessage(`Failed to delete ${deleteType}. Please try again.`);
        setShowToast(true);
      }
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
      setDeleteType(null);
    }
  };

  // Function to handle box/location creation
  const handleBoxCreated = (newBox) => {
    setProject(prevProject => ({
      ...prevProject,
      boxes: [newBox, ...(prevProject.boxes || [])], // Add new box at the top
      boxCount: (prevProject.boxCount || 0) + 1
    }));

    setToastMessage(`Location "${newBox.boxName || newBox.name}" created successfully.`);
    setShowToast(true);
  };

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading project details...</p>
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

  if (!project) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="text-center">
          Project not found.
        </Alert>
      </Container>
    );
  }

return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="text-center flex-grow-1">{project.projectName}</h1>
            <div className="d-flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateBoxModal(true)}
                title="Add new location"
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                Add Location
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDeleteProject}
                title="Delete project"
              >
                <FontAwesomeIcon icon={faTrash} className="me-1" />
                Delete
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <Table className="mb-0" style={{ minWidth: '1200px' }}>
                  <thead 
                    className="table-light" 
                    style={{ 
                      position: 'sticky', 
                      top: 0, 
                      zIndex: 10,
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <tr>
                      {columns.map((column, index) => (
                        <th 
                          key={column.key} 
                          style={{ 
                            fontWeight: '600',
                            borderRight: index < columns.length - 1 ? '1px solid #dee2e6' : 'none',
                            whiteSpace: 'nowrap',
                            minWidth: column.key === 'name' ? '300px' : '120px'
                          }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {project.boxes && project.boxes.length > 0 ? (
                      renderTableRows(project.boxes).rows
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="text-center text-muted py-4">
                          No locations found in this project.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Part Details Modal */}
      <PartModal 
        show={showPartModal} 
        onHide={() => setShowPartModal(false)} 
        part={selectedPart}
        allParts={currentBoxParts}
        currentPartIndex={currentPartIndex}
        onPartChange={handlePartChange}
        projectData={project}
        currentLocation={selectedPart ? findBoxContainingPart(project?.boxes || [], selectedPart.partId) : null}
        onLocationChange={handleLocationChange}
      />

      {/* Create Box Modal */}
      <CreateBoxModal
        show={showCreateBoxModal}
        onHide={() => setShowCreateBoxModal(false)}
        onBoxCreated={handleBoxCreated}
        projectId={projectId}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
          setDeleteType(null);
        }}
        onConfirm={confirmDelete}
        title={
          deleteType === 'project' ? 'Delete Project' :
          deleteType === 'box' ? 'Delete Location' :
          deleteType === 'part' ? 'Delete Part' : 'Delete'
        }
        message={
          deleteType === 'project' 
            ? `Are you sure you want to delete "${itemToDelete?.projectName}"? This action cannot be undone.`
            : deleteType === 'box'
            ? `Are you sure you want to delete location "${itemToDelete?.boxName}"? This will also delete all its sub-locations and parts. This action cannot be undone.`
            : deleteType === 'part'
            ? `Are you sure you want to delete part "${itemToDelete?.partName || itemToDelete?.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this item?'
        }
        confirmText={
          deleteType === 'project' ? 'Delete Project' :
          deleteType === 'box' ? 'Delete Location' :
          deleteType === 'part' ? 'Delete Part' : 'Delete'
        }
        loading={deleteLoading}
      />

      {/* Toast for notifications */}
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

export default ProjectVerboseView;

