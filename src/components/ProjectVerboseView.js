import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Toast, ToastContainer, Form, InputGroup } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faGlobe, faTrash, faChevronDown, faChevronRight, faThumbsUp, faThumbsDown, faPencil, faCheck, faTimes, faSort, faSortAsc, faSortDesc } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import PartModal from './PartModal';
import ConfirmationModal from './ConfirmationModal';
import CreateBoxModal from './CreateBoxModal';
import ProjectHeader from './ProjectHeader';


const ProjectVerboseView = ({ isViewOnly = false }) => {
  const { user } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [userCanEdit, setUserCanEdit] = useState(!isViewOnly);
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

  // States for inline editing
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [tempBoxName, setTempBoxName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const boxNameInputRefs = useRef({});

  // Sorting & Filtering state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [filterField, setFilterField] = useState('all');

  const normalize = (val) => {
    return (val || '').toString().toLowerCase().replace(/[^a-z0-9]/gi, '');
  };

  const matchesFilter = (part) => {
    const normFilter = normalize(filterText);
    if (!normFilter) {
        return true;
    }
    if (filterField === 'all') {
        return Object.values(part).some(value =>
            Array.isArray(value) ? value.some(item => normalize(item).includes(normFilter)) : normalize(value).includes(normFilter)
        );
    } else {
        const value = part[filterField];
        return Array.isArray(value) ? value.some(item => normalize(item).includes(normFilter)) : normalize(value).includes(normFilter);
    }
  };

  // Define the columns as specified
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'mpn', label: 'MPN' },
    { key: 'secondarypartnumber', label: 'Secondary PN' },
    { key: 'quantity', label: 'QTY' },
    { key: 'manufacturer', label: 'MFR' },
    { key: 'datecode', label: 'Datecode' },
    { key: 'coo', label: 'COO' },
    { key: 'rohsstatus', label: 'RoHS' },
    { key: 'msl', label: 'MSL' },
    { key: 'serialnumber', label: 'Serial Number'},
    { key: 'lotcode', label: 'Lot Code'},
    { key: 'notes', label: 'Notes' },
    { key: 'ipn', label: 'IPN'},
    { key: 'ipnquantity', label: 'Internal QTY'},
    { key: 'ipnlotserial', label: 'Internal Serial/Lot Number'},
    { key: 'eccn', label: 'ECCN'},
    { key: 'htsus', label: 'HTSUS'},
    { key: 'price_at_my_break', label: 'Price at my break'},
    { key: 'quantity_at_my_break', label: 'Quantity at my break'},
    { key: 'lowest_price_at_any_break', label: 'Lowest price at any break'},
    { key: 'quantity_at_that_price_break', label: 'Quantity at that price break'}
  ];

  const REVIEW_STATUS_MAPPINGS = {
    'reviewed': { color: '#28a745', titleText: 'Reviewed'},
    'more_photos_requested': { color: '#d5b60a', titleText: 'More photos requested' },
    'never_reviewed': { color: '#6c757d', titleText: 'Not reviewed' }
  }

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await apiService.getProjectDetails(projectId);
        setProject(response.data);
        setUserCanEdit(userCanEdit && !(response.data?.projectMetadata?.userId !== user?.user_id));
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
    if (currentPath.includes('/verbose') || currentPath.includes('/view') || currentPath.includes('/edit')) {
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
    // For parts, try to get values from generated or manual content as fallback
    const fieldValue = item[field] || item.manualContent?.[field] || item.generatedContent?.[field] || '';
    return Array.isArray(fieldValue) ? fieldValue.join(', ') : fieldValue;
  };

  // Function to get status indicator for parts
  const getStatusIndicator = (part) => {
    const reviewStatus = part.status || 'never_reviewed';
    const color = REVIEW_STATUS_MAPPINGS[reviewStatus]?.color || '#6c757d';
    const title = REVIEW_STATUS_MAPPINGS[reviewStatus]?.titleText || 'Needs further review';

    return (
      <FontAwesomeIcon
        icon={reviewStatus == 'reviewed' ? faThumbsUp : faThumbsDown}
        style={{
          color: color,
          fontSize: '14px',
          marginLeft: '6px'
        }}
        title={title}
      />
    );
  };

  // Function to get status indicator for locations
  const getStatusIndicatorForLocation = (box) => {
    const partCount = (box.partCount || 0) + (box.subLocationsPartCount || 0);
    const numReviewedParts = box.numReviewedParts || 0;
    const numPartsRequiringMorePhotos = box.numPartsRequiringMorePhotos || 0;
    let locationStatus = 'unreviewed';
    let color = '';
    let title = '';
    let locationIcon;
    if (partCount == numReviewedParts) {
        locationStatus = 'reviewed';
        color = '#28a745';
        title = 'Reviewed';
        locationIcon = faThumbsUp;
    } else if (numPartsRequiringMorePhotos > 0) {
        locationStatus = 'more_photos_needed';
        color = '#d5b60a';
        title = 'Needs review';
        locationIcon = faThumbsDown;
    }

    if (locationStatus == 'unreviewed') {
        return '';
    }

    return (
      <FontAwesomeIcon 
        icon={locationIcon}
        style={{ 
          color: color, 
          fontSize: '14px', 
          marginLeft: '6px' 
        }}
        title={title}
      />
    );
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

  // Function to handle part navigation and status updates from the modal
  const handlePartChange = (newIndex = null, updatedPart = null) => {
    // Handle navigation case
    if (newIndex !== null && newIndex >= 0 && newIndex < currentBoxParts.length) {
      const newPart = currentBoxParts[newIndex];
      setSelectedPart(newPart);
      setCurrentPartIndex(newIndex);
    }

    // Handle status update case
    if (updatedPart && updatedPart.partId) {
      // Update the part in currentBoxParts array
      const updatedBoxParts = currentBoxParts.map(part => 
        part.partId === updatedPart.partId ? updatedPart : part
      );
      setCurrentBoxParts(updatedBoxParts);

      // Update the project state to reflect status changes in the table
      setProject(prevProject => {
        const updatePartInBoxes = (boxes) => {
          return boxes.map(box => {
            if (box.parts && box.parts.length > 0) {
              box.parts = box.parts.map(part => 
                part.partId === updatedPart.partId ? { ...part, ...updatedPart } : part
              );
            }
            // Recursively update child boxes
            if (box.childBoxes && box.childBoxes.length > 0) {
              box.childBoxes = updatePartInBoxes(box.childBoxes);
            }
            return box;
          });
        };

        return {
          ...prevProject,
          boxes: updatePartInBoxes(prevProject.boxes)
        };
      });

      // Update the selected part if it's the one that was updated
      setSelectedPart(updatedPart);
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

  const pluralizeWithCount = (word, numCount = 0) => {
      return numCount === 1 ? `1 ${word}` : `${numCount} ${word}s`;
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
              className="ic-small"
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
                    {editingBoxId === box.boxId ? (
                      <div className="d-inline-flex align-items-center gap-1">
                        <span>📦</span>
                        <Form.Control
                          ref={(el) => { boxNameInputRefs.current[box.boxId] = el; }}
                          type="text"
                          value={tempBoxName}
                          onChange={(e) => setTempBoxName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveBoxName(box.boxId, projectId);
                            if (e.key === 'Escape') cancelEditingBoxName();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            fontWeight: 'bold',
                            width: 'auto',
                            minWidth: '150px',
                            maxWidth: '300px',
                            height: '28px',
                            padding: '2px 8px'
                          }}
                          disabled={savingName}
                        />
                        <Button
                          variant="success"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveBoxName(box.boxId, projectId);
                          }}
                          disabled={savingName}
                          style={{ padding: '2px 6px', fontSize: '12px' }}
                          title="Save"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditingBoxName();
                          }}
                          disabled={savingName}
                          style={{ padding: '2px 6px', fontSize: '12px' }}
                          title="Cancel"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      </div>
                    ) : (
                      <div className="d-inline-flex align-items-center gap-1">
                        <Link 
                          to={`/box/${box.boxId}`}
                          onClick={(e) => handleBoxClick(box.boxId, e)}
                          style={{ textDecoration: 'none', color: '#0066cc', fontWeight: 'bold' }}
                        >
                          {getStatusIndicatorForLocation(box)} 📦 {box.boxName}
                        </Link>
                        {userCanEdit && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingBoxName(box);
                              }}
                              className="text-secondary p-0"
                              style={{ fontSize: '12px' }}
                              title="Edit location name"
                            >
                              <FontAwesomeIcon icon={faPencil} />
                            </Button>
                        )}
                      </div>
                    )}
                    {box.imageUri && (<Link to={box.imageUri} target="_blank"> <FontAwesomeIcon icon={faImage} /> </Link>)}

                    <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '0.5rem' }}>
                      ({pluralizeWithCount('part', box.partCount || 0)}, {pluralizeWithCount('sub-location', box.subBoxCount || 0)}, {pluralizeWithCount('part', box.partCount || 0 + box.subLocationsPartCount || 0)})
                    </span>
                  </div>
                  {userCanEdit && (
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
                  )}
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
          let filteredParts = box.parts.filter(matchesFilter);
          if (sortConfig.key) {
            filteredParts = [...filteredParts].sort((a, b) => {
                const valA = normalize(a[sortConfig.key]);
                const valB = normalize(b[sortConfig.key]);
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
          }
          filteredParts.forEach(part => {
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
                    className="ic-small"
                    style={{ 
                      paddingLeft: column.key === 'name' ? `${(level + 1) * 1.5}rem` : '0.75rem',
                      borderRight: '1px solid #e9ecef',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {column.key === 'name' && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIndicator(part)}
                        <Link 
                          to={`/part/${part.partId}`}
                          onClick={(e) => handlePartClick(part, e)}
                          style={{ textDecoration: 'none', color: '#333', cursor: 'pointer', marginLeft: '6px' }}
                        >
                          🔧 {part.name}
                        </Link>
                        {'imageCount' in part && (
                            <span style={{ color: '#666', fontSize: '9px', marginLeft: '0.5rem' }}>
                                ({part.imageCount} images)
                            </span>
                        )}
                        {userCanEdit && (
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
                        )}
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

  const onCopyPublicProjectUrl = () => {
    const link = `${window.location.origin}/project/${projectId}/view`;
    navigator.clipboard.writeText(link)
        .then(() => setToastMessage("Successfully copied link to clipboard"))
        .catch(() => setToastMessage("Failed to copy link"));
    setShowToast(true);
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

  // Functions for inline editing
  const startEditingBoxName = (box) => {
    setEditingBoxId(box.boxId);
    setTempBoxName(box.boxName);
    setTimeout(() => {
      boxNameInputRefs.current[box.boxId]?.focus();
      boxNameInputRefs.current[box.boxId]?.select();
    }, 0);
  };

  const cancelEditingBoxName = () => {
    setEditingBoxId(null);
    setTempBoxName('');
  };

  const saveBoxName = async (boxId, providedProjectId) => {
    if (tempBoxName.trim() === '') {
      cancelEditingBoxName();
      return;
    }

    setSavingName(true);
    try {
      await apiService.updateBox(
          boxId,
          { box_name: tempBoxName, project_id: providedProjectId }
      );

      // Update the box name in the project state
      setProject(prevProject => {
        const updateBoxName = (boxes) => {
          return boxes.map(box => {
            if (box.boxId === boxId) {
              return { ...box, boxName: tempBoxName };
            }
            if (box.childBoxes && box.childBoxes.length > 0) {
              return {
                ...box,
                childBoxes: updateBoxName(box.childBoxes)
              };
            }
            return box;
          });
        };

        return {
          ...prevProject,
          boxes: updateBoxName(prevProject.boxes)
        };
      });

      setToastMessage(`Location name updated successfully.`);
      setShowToast(true);
      setEditingBoxId(null);
    } catch (error) {
      console.error('Failed to update location name:', error);
      setToastMessage('Failed to update location name. Please try again.');
      setShowToast(true);
    } finally {
      setSavingName(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-5 ic-container">
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
    <Container fluid className="py-5 ic-container">
      <ProjectHeader
        project={project}
        projectId={projectId}
        leftButton={{
          text: 'All Parts Search',
          icon: faGlobe,
          destinationUrl: `/project/${projectId}/allparts/${userCanEdit ? 'edit' : 'view'}`,
          title: 'Go to all parts search'
        }}
        showAddLocation={true}
        onAddLocation={() => setShowCreateBoxModal(true)}
        onProjectUpdate={setProject}
        onDeleteProject={handleDeleteProject}
        onShowToast={(message) => {
          setToastMessage(message);
          setShowToast(true);
        }}
        userCanEdit={userCanEdit}
        onCopyPublicProjectUrl={onCopyPublicProjectUrl}
      />

      <Row>
        <Col className="mb-3">
          <InputGroup style={{ maxWidth: '400px' }}>
            <Form.Select value={filterField} onChange={e => setFilterField(e.target.value)}>
                <option value="all">All Fields</option>
                {columns.filter(c => c.key !== 'name').map(col => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                ))}
            </Form.Select>
            <Form.Control
                type="text"
                placeholder="Filter parts..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="filter-input"
            />
          </InputGroup>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <Table className="mb-0" style={{ minWidth: '1200px' }} size="sm">
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
                          onClick={() => {
                            const direction = sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                            setSortConfig({ key: column.key, direction });
                          }}
                          style={{ 
                            fontWeight: '600',
                            borderRight: index < columns.length - 1 ? '1px solid #dee2e6' : 'none',
                            whiteSpace: 'nowrap',
                            fontSize: '14px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            paddingTop: '2px',
                            paddingBottom: '2px',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          {column.label}
                          <FontAwesomeIcon
                            icon={sortConfig.key === column.key ? (sortConfig.direction === 'asc' ? faSortAsc : faSortDesc) : faSort}
                            style={{ marginLeft: '5px', fontSize: '12px' }}
                          />
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
        userCanEdit={userCanEdit}
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
          bg={toastMessage?.toLowerCase()?.includes('successfully') ? "success" : "danger"}
        >
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default ProjectVerboseView;

