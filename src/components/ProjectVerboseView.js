import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import PartModal from './PartModal';
import ConfirmationModal from './ConfirmationModal';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Define the columns as specified
  const columns = [
    { key: 'name', label: 'Location' },
    { key: 'coo', label: 'COO' },
    { key: 'rohsStatus', label: 'RoHSStatus' },
    { key: 'secondaryPartNumber', label: 'SecondaryPartNumber' },
    { key: 'datecode', label: 'Datecode' },
    { key: 'msl', label: 'MSL' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'mpn', label: 'MPN' }
  ];

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching project details for ID:', projectId);

        const response = await apiService.getProjectDetails(projectId);
        console.log('Project details response:', response);

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
      console.log('Location details response:', response);

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
    if (item.generatedContent || item.manualContent) {
      const generatedValue = item.generatedContent?.[field];
      const manualValue = item.manualContent?.[field];

      switch (field) {
        case 'coo':
          return generatedValue || manualValue || item.generatedContent?.COO || item.manualContent?.COO || 'N/A';
        case 'rohsStatus':
          return generatedValue || manualValue || item.generatedContent?.RoHS || item.manualContent?.RoHS || 'N/A';
        case 'secondaryPartNumber':
          return generatedValue || manualValue || item.generatedContent?.['Secondary Part Number'] || item.manualContent?.['Secondary Part Number'] || 'N/A';
        case 'datecode':
          return generatedValue || manualValue || item.generatedContent?.Datecode || item.manualContent?.Datecode || 'N/A';
        case 'msl':
          return generatedValue || manualValue || item.generatedContent?.MSL || item.manualContent?.MSL || 'N/A';
        case 'manufacturer':
          return generatedValue || manualValue || item.generatedContent?.Manufacturer || item.manualContent?.Manufacturer || 'N/A';
        case 'quantity':
          return generatedValue || manualValue || item.generatedContent?.Quantity || item.manualContent?.Quantity || 'N/A';
        case 'mpn':
          return generatedValue || manualValue || item.generatedContent?.MPN || item.manualContent?.MPN || 'N/A';
        default:
          return 'N/A';
      }
    }
    return 'N/A';
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
          {columns.map(column => (
            <td 
              key={column.key} 
              style={{ 
                paddingLeft: column.key === 'name' ? paddingLeft : '0.75rem',
                borderRight: '1px solid #e9ecef',
                whiteSpace: 'nowrap'
              }}
            >
              {column.key === 'name' && (
                <Link 
                  to={`/box/${box.boxId}`}
                  onClick={(e) => handleBoxClick(box.boxId, e)}
                  style={{ textDecoration: 'none', color: '#0066cc', fontWeight: 'bold' }}
                >
                  📦 {box.boxName}
                </Link>
              )}
              {column.key === 'name' && (
                <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '0.5rem' }}>
                  ({box.subBoxCount} sub-locations, {box.partCount} parts)
                </span>
              )}
              {column.key !== 'name' && (
                <span style={{ color: '#999' }}>—</span>
              )}
            </td>
          ))}
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
                      <Link 
                        to={`/part/${part.partId}`}
                        onClick={(e) => { e.preventDefault(); setSelectedPart(part); setShowPartModal(true); }}
                        style={{ textDecoration: 'none', color: '#333', cursor: 'pointer' }}
                      >
                        🔧 {part.partName || part.name}
                      </Link>
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
    setShowDeleteModal(true);
  };

  // Function to confirm project deletion
  const confirmDeleteProject = async () => {
    if (!project) return;

    try {
      setDeleteLoading(true);
      await apiService.deleteProject(project.projectId);
      
      // Navigate back to dashboard on successful deletion
      navigate('/');
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError(`Failed to delete project "${project.projectName}". Please try again.`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
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
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="text-center flex-grow-1">📁 {project.projectName}</h1>
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
      />
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${project?.projectName}"? This action cannot be undone.`}
        confirmText="Delete Project"
        loading={deleteLoading}
      />
    </Container>
  );
};

export default ProjectVerboseView;

