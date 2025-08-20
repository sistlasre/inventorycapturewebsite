import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import { apiService } from '../services/apiService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortAsc, faSortDesc, faThumbTack } from '@fortawesome/free-solid-svg-icons';
import ProjectHeader from './ProjectHeader';
import ConfirmationModal from './ConfirmationModal';

function AllPartsForProjectTableView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const normalize = (val) => {
    return (val || '').toString()
                      .toLowerCase()
                      .replace(/[^a-z0-9]/gi, ''); // strip non-alphanumeric
  };

  useEffect(() => {
    const fetchAllPartsForProject = async () => {
        const response = await apiService.getAllPartsForProject(projectId);
        const parts = response.data.parts || [];
        parts.forEach((part) => {
            part['boxName'] = response.data.boxNames[part.boxId];
            part['locationTree'] = response.data.locationTree[part.boxId];
        });
        setParts(parts);
        setFilteredParts(parts);
        setProject({
          projectId: projectId,
          projectName: response.data.projectName
        });
    };
    if (projectId) {
        fetchAllPartsForProject();
    }
  }, [projectId]);

  // Filtering
  useEffect(() => {
    const normFilter = normalize(filterText);
    setFilteredParts(
      parts.filter(part => {
        if (filterField === 'all') {
            return Object.values(part).some(value =>
                Array.isArray(value)
                ? value.some(item => normalize(item).includes(normFilter))
                : normalize(value).includes(normFilter)
            );
        } else {
            const value = part[filterField];
            return Array.isArray(value) ? value.some(item => normalize(item).includes(normFilter)) : normalize(value).includes(normFilter);
        }
      })
    );
  },[filterText, filterField, parts]);

  // Sorting
  const handleSort = key => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const sorted = [...filteredParts].sort((a, b) => {
      const valA = normalize(a[key]) || '';
      const valB = normalize(b[key]) || '';
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setSortConfig({ key, direction });
    setFilteredParts(sorted);
  };

  const columns = [
    { key: 'boxName', label: 'Location Name' },
    { key: 'name', label: 'Part Name' },
    { key: 'mpn', label: 'MPN' },
    { key: 'secondarypartnumber', label: 'Secondary PN' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'coo', label: 'COO' },
    { key: 'rohsstatus', label: 'RoHS' },
    { key: 'datecode', label: 'Date Code' },
    { key: 'serialorlotnumber', label: 'Serial/Lot Number' },
    { key: 'notes', label: 'Notes' },
    { key: 'ipn', label: 'IPN'},
    { key: 'ipnlotserial', label: 'Internal Lot Code/Serial Number'}
  ];

  // Function to handle project deletion
  const handleDeleteProject = () => {
    setShowDeleteModal(true);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await apiService.deleteProject(projectId);
      // Navigate back to dashboard on successful deletion
      navigate('/');
    } catch (error) {
      console.error('Failed to delete project:', error);
      setToastMessage(`Failed to delete project. Please try again.`);
      setShowToast(true);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <Container fluid className="py-5 ic-container">
      <ProjectHeader
        project={project}
        projectId={projectId}
        leftButton={{
          text: 'Location View',
          icon: faThumbTack,
          onClick: (e) => {
            e.stopPropagation();
            e.preventDefault();
            window.location.href = `/project/${projectId}/verbose`;
          },
          title: 'Go to location view'
        }}
        showAddLocation={false}
        onProjectUpdate={setProject}
        onDeleteProject={handleDeleteProject}
        onShowToast={(message) => {
          setToastMessage(message);
          setShowToast(true);
        }}
      />

      <Row className="mb-3">
        <Col>
          <InputGroup style={{ maxWidth: '400px' }}>
            <Form.Select value={filterField} onChange={e => setFilterField(e.target.value)}>
                <option value="all">All Fields</option>
                {columns.map(col => (
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
                          onClick={() => handleSort(column.key)}
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
                    {filteredParts.length > 0 ? (
                      filteredParts.map((part, idx) => {
                        const isEvenRow = idx % 2 === 0;
                        return (
                          <tr 
                            key={idx}
                            style={{ 
                              backgroundColor: isEvenRow ? '#f9f9f9' : '#ffffff'
                            }}
                          >
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Link 
                                to={`/box/${part.boxId}`}
                                title={part.locationTree}
                                style={{ textDecoration: 'none', color: '#0066cc', fontWeight: 'bold' }}
                              >
                                📦 {part.boxName}
                              </Link>
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              🔧 {part.name}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.mpn}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.secondarypartnumber}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.manufacturer}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.coo}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.rohsstatus}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.datecode}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {Array.isArray(part.serialorlotnumber)
                                ? part.serialorlotnumber.join(', ')
                                : part.serialorlotnumber}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.notes}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                borderRight: '1px solid #e9ecef',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {part.ipn}
                            </td>
                            <td 
                              className="ic-small"
                              style={{ 
                                paddingLeft: '0.75rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {Array.isArray(part.ipnlotserial)
                                ? part.ipnlotserial.join(', ')
                                : part.ipnlotserial}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="text-center text-muted py-4">
                          {filterText ? 'No parts found matching your filter.' : 'No parts found in this project.'}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${project?.projectName}"? This action cannot be undone.`}
        confirmText="Delete Project"
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
}

export default AllPartsForProjectTableView;

