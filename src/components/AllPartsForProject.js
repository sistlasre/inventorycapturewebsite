import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from 'react-bootstrap/Table';

const API_URL = 'https://eadlroekyg.execute-api.us-east-1.amazonaws.com/dev/project/cdb4ce3f-713c-45ac-82e1-cabe41af2b2e/allparts';

function AllPartsForProjectTableView() {
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [boxNames, setBoxNames] = useState({});
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        const sortedParts = (data.parts || []).sort((part1, part2) => part1.boxId.localeCompare(part2.boxId));
        setParts(sortedParts || []);
        setFilteredParts(sortedParts || []);
        setBoxNames(data.boxNames || {});
        setProjectName(data.projectName);
      });
  }, []);

  // Filtering
  useEffect(() => {
    const lower = filterText.toLowerCase();
    setFilteredParts(
      parts.filter(part =>
        Object.values(part).some(value =>
          Array.isArray(value)
            ? value.some(item => (item || '').toString().toLowerCase().includes(lower))
            : (value || '').toString().toLowerCase().includes(lower)
        )
      )
    );
  }, [filterText, parts]);

  // Sorting
  const handleSort = key => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const sorted = [...filteredParts].sort((a, b) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setSortConfig({ key, direction });
    setFilteredParts(sorted);
  };

  const columns = [
    { key: 'boxId', label: 'Box Name' },
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
      <input
        type="text"
        placeholder="Filter parts..."
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
        className="filter-input"
      />
      <Table className="parts-table mb-0" style={{ minWidth: '1200px' }} size="sm">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredParts.map((part, idx) => (
            <tr key={idx}>
              <td><Link to={`/box/${part.boxId}`}>{boxNames[part.boxId] || part.boxId}</Link></td>
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

