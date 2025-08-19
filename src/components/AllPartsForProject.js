import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Form, InputGroup } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import { apiService } from '../services/apiService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortAsc, faSortDesc } from '@fortawesome/free-solid-svg-icons';

function AllPartsForProjectTableView() {
  const { projectId } = useParams();
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [projectName, setProjectName] = useState('');
  const [filterField, setFilterField] = useState('all');

  const normalize = (val) => {
    return (val || '').toString()
                      .toLowerCase()
                      .replace(/[^a-z0-9]/gi, ''); // strip non-alphanumeric
  };

  useEffect(() => {
    const fetchAllPartsForProject = async () => {
        const response = await apiService.getAllPartsForProject(projectId);
        const parts = response.data.parts || [];
        parts.forEach((part) => part['boxName'] = response.data.boxNames[part.boxId]);
        setParts(parts);
        setFilteredParts(parts);
        setProjectName(response.data.projectName);
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
  ];

  return (
    <div className="parts-table-container">
      <h2>All Parts Search For <b>{projectName}</b></h2>
      <InputGroup className="mb-3" style={{ maxWidth: '400px' }}>
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
      <Table className="parts-table mb-0" style={{ minWidth: '1200px' }} size="sm">
        <thead>
          <tr className="sortable-column">
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                <FontAwesomeIcon icon={sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? faSortAsc : faSortDesc) : faSort} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredParts.map((part, idx) => (
            <tr key={idx}>
              <td><Link to={`/box/${part.boxId}`}>{part.boxName}</Link></td>
              <td className="part-name-cell">
                {part.name}
              </td>
              <td>{part.mpn}</td>
              <td>{part.secondarypartnumber}</td>
              <td>{part.manufacturer}</td>
              <td>{part.coo}</td>
              <td>{part.rohsstatus}</td>
              <td>{part.datecode}</td>
              <td>
                {Array.isArray(part.serialorlotnumber)
                  ? part.serialorlotnumber.join(', ')
                  : part.serialorlotnumber}
              </td>
              <td>{part.notes}</td>
            </tr>
          ))}
        </tbody>
      </Table>

    </div>
  );
}

export default AllPartsForProjectTableView;

