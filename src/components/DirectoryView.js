import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';

const DirectoryNode = ({ node }) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="directory-node">
      <div className="node-header" onClick={handleToggle} style={{ cursor: 'pointer' }}>
        {node.children && (
          <span>{expanded ? <FaChevronDown /> : <FaChevronRight />}</span>
        )}
        <strong>{node.name}</strong>
      </div>
      {expanded && node.children && (
        <div className="node-children">
          {node.children.map((child) => (
            <DirectoryNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

DirectoryNode.propTypes = {
  node: PropTypes.shape({
    name: PropTypes.string.isRequired,
    children: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};

const DirectoryView = ({ data }) => {
  return (
    <div className="directory-view">
      {data.map((rootNode) => (
        <DirectoryNode key={rootNode.id} node={rootNode} />
      ))}
    </div>
  );
};

DirectoryView.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      children: PropTypes.arrayOf(PropTypes.object),
    })
  ).isRequired,
};

export default DirectoryView;

