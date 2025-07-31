import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="bg-dark text-light py-3 mt-auto">
      <Container>
        <div className="text-center">
          <p className="mb-0">
            &copy; 2024 Inventory Manager. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
